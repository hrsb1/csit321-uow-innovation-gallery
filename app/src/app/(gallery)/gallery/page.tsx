//Author:
//Jonty Hourn: Intergration with AWS Amplify
//Yoses Riandy: UI
//Ian Cuchapin: UI Changes
//Description: This is the gallery page for the application. It displays a gallery of projects submitted by students, with options to filter and search through them.
"use client";

import React, { useMemo, useRef, useState } from "react";
import { Card, Row, Col, Input, Select, Button, Tag, SelectProps, Spin, Pagination } from "antd";
import { Image as AntImage } from "antd";
import NextImage from "next/image";
import { CalendarOutlined, PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import { getUrl } from "aws-amplify/storage";
import debounce from "lodash/debounce";
import { getCurrentUser } from "aws-amplify/auth";



const client = generateClient<Schema>();

export interface DebounceSelectProps<ValueType extends { key?: string; label: React.ReactNode; value: string | number } = { key?: string; label: React.ReactNode; value: string | number }>
  extends Omit<SelectProps<ValueType | ValueType[]>, "options" | "children"> {
  fetchOptions: (search: string) => Promise<ValueType[]>;
  debounceTimeout?: number;
}

function DebounceSelect<
  ValueType extends { key?: string; label: React.ReactNode; value: string | number } = { key?: string; label: React.ReactNode; value: string | number }
>({ fetchOptions, debounceTimeout = 800, ...props }: DebounceSelectProps<ValueType>) {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<ValueType[]>([]);
  const fetchRef = useRef(0);

  const debounceFetcher = useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions(value).then((newOptions) => {
        if (fetchId !== fetchRef.current) {
          return;
        }
        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout]);

  return (
    <Select
      labelInValue
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      {...props}
      options={options}
    />
  );
}

function capitalizeEachWord(text: string): string {
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function fetchTagList(search: string): Promise<{ label: string; value: string }[]> {

  if (!search) return [];

  const lowerSearch = search.toLowerCase();

  let authMode = false;
try{
  await getCurrentUser();
}
catch{
  authMode = true;
}
if (authMode) {
  const result = await client.models.Tags.list({
    authMode: 'identityPool',
    limit: 1000,
  }); 
  const matched = result.data.filter(tag =>
    tag.tagName?.toLowerCase().includes(lowerSearch)
  );

  // Sort: tags that start with the input come first
  matched.sort((a, b) => {
    const aStarts = a.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    const bStarts = b.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    return aStarts - bStarts;
  });

  return matched.map(tag => ({
    label: capitalizeEachWord(tag.tagName),
    value: tag.tagName,
  }));
}
else{
  const result = await client.models.Tags.list({
    authMode: 'userPool',
    limit: 1000,
  });
   const matched = result.data.filter(tag =>
    tag.tagName?.toLowerCase().includes(lowerSearch)
  );

  // Sort: tags that start with the input come first
  matched.sort((a, b) => {
    const aStarts = a.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    const bStarts = b.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    return aStarts - bStarts;
  });

  return matched.map(tag => ({
    label: capitalizeEachWord(tag.tagName),
    value: tag.tagName,
  }));
}
}

export default function GalleryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  React.useEffect(() => {
    async function fetchGalleryItems() {
      try{
         await getCurrentUser();
        const response = await client.models.Projects.list({ filter: { projectStatus: { eq: "Approved" } }, authMode: 'userPool' });
        const items = await Promise.all(
          response.data.map(async (project) => {
            const linkToStoreFile = project.ProjectCoverImagePath
              ? await getUrl({ path: project.ProjectCoverImagePath })
              : { url: "" };
            return {
              id: project.id,
              title: project.projectTitle ?? "Untitled",
              image: String(linkToStoreFile.url),
              year: project.projectYear ?? "Unknown",
              tags: Array.isArray(project.projectTags) ? project.projectTags.filter((tag): tag is string => tag !== null) : [project.projectTags ?? "Uncategorized"],
            };
          })
        );
        setGalleryItems(items);
        setIsLoading(false);
      }
      catch{
        const response = await client.models.Projects.list({ filter: { projectStatus: { eq: "Approved" } }, authMode: 'identityPool' });
        const items = await Promise.all(
          response.data.map(async (project) => {
            const linkToStoreFile = project.ProjectCoverImagePath
              ? await getUrl({ path: project.ProjectCoverImagePath })
              : { url: "" };
            return {
              id: project.id,
              title: project.projectTitle ?? "Untitled",
              image: String(linkToStoreFile.url),
              year: project.projectYear ?? "Unknown",
              tags: Array.isArray(project.projectTags) ? project.projectTags.filter((tag): tag is string => tag !== null) : [project.projectTags ?? "Uncategorized"],
            };
          })
        );
        setGalleryItems(items);
        setIsLoading(false);
      }
    }
    fetchGalleryItems();
  }, []);


  interface GalleryItem {
    id: string;
    title: string;
    image: string;
    year: string;
    tags: string[];
  }

  const loweredSearchTerm = searchTerm.trim().toLowerCase();

  const filteredItems = galleryItems
    .filter((item: GalleryItem) => {
      const matchesSearch = loweredSearchTerm === "" || item.title.toLowerCase().includes(loweredSearchTerm);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(item.year);
      const matchesField = selectedTags.length === 0 || selectedTags.some((field: string) =>
        item.tags.some((tag) => tag.toLowerCase().includes(field.toLowerCase()))
      );
      return matchesSearch && matchesYear && matchesField;
    })
    .sort((a, b) => {
      // Prioritize startsWith match first
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aStarts = aTitle.startsWith(loweredSearchTerm) ? -1 : 0;
      const bStarts = bTitle.startsWith(loweredSearchTerm) ? -1 : 0;
      if (aStarts !== bStarts) return aStarts - bStarts;

      // Then sort by year (newest or oldest)
      const aYear = parseInt(a.year) || 0;
      const bYear = parseInt(b.year) || 0;
      return sortOrder === "newest" ? bYear - aYear : aYear - bYear;
    });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div className="bg-white min-h-screen">

      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
        <NextImage
          src="/images/galleryPage.jpg"
          alt="Innovation Gallery Banner"
          fill
          className="object-cover"
          quality={100}
          priority
        />

        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center px-4 md:pl-40 text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-2 md:mb-4">
        Explore Innovation at UOW
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-full md:max-w-2xl">
        Discover student-led projects transforming ideas into real-world impact.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-5 mx-2 md:mx-10 my-5">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Left Side: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
        {/* 🔹 Search Bar */}
        <Input
          placeholder="Search project"
          size="large"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "100%", maxWidth: 384, borderRadius: 0 }}
          className="w-full md:w-auto"
        />

        {/* 🔹 Year Filter */}
        <Select
          mode="multiple"
          size="large"
          className="custom-no-radius w-full md:w-auto"
          placeholder="Select year(s)"
          value={selectedYears}
          onChange={(value) => setSelectedYears(value)}
          options={Array.from({ length: 30 }, (_, i) => {
            const year = (new Date().getFullYear() - i).toString();
            return { label: year, value: year };
          })}
          allowClear
          suffixIcon={<CalendarOutlined />}
          style={{
            width: "100%",
            maxWidth: 180,
          }}
          dropdownStyle={{ maxHeight: 300 }}
        />

        {/* 🔹 Tags Filter */}
        <DebounceSelect
          mode="multiple"
          size="large"
          className="custom-no-radius w-full md:w-auto"
          placeholder="Search and select tags"
          fetchOptions={fetchTagList}
          value={selectedTags.map(tag => ({ label: capitalizeEachWord(tag), value: tag }))}
          onChange={(newValue) => {
            if (Array.isArray(newValue)) {
          setSelectedTags(newValue.map((tag) => tag.value));
            }
          }}
          style={{ width: "100%", maxWidth: 230 }}
        />

        {/* 🔹 Sort Filter */}
        <Select
          size="large"
          className="custom-no-radius w-full md:w-auto"
          value={sortOrder}
          onChange={(value) => setSortOrder(value)}
          style={{ width: "100%", maxWidth: 180 }}
          options={[
            { label: "Sort by Newest", value: "newest" },
            { label: "Sort by Oldest", value: "oldest" },
          ]}
        />
          </div>

          <div className="flex justify-end w-full md:w-auto">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="px-5 bg-blue-500 hover:bg-blue-600 text-white !rounded-none w-full md:w-auto"
          onClick={() => router.push("/submitproject")}
          style={{ backgroundColor: "#0033FF", fontWeight: "bold" }}
        >
          Submit Project
        </Button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <Spin size="large" />
        </div>
      ) : (

      // Gallery Items
      <div className="px-16">
        {paginatedItems.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {paginatedItems.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    cover={
                      <AntImage
                        src={item.image}
                        alt={item.title}
                        preview={false}
                        className="h-48 w-full object-cover rounded-t-lg"
                      />
                    }
                    className="rounded-lg shadow-md overflow-hidden hover:bg-blue-100 cursor-pointer"
                    bodyStyle={{ padding: "12px" }}
                    onClick={() => router.push(`/gallery/${item.id}`)}
                  >
                    {/* 🔹 Content container with fixed height and scrollable overflow */}
                    <div className="flex flex-col justify-start h-[110px] overflow-hidden">
                      
                      {/* 🔹 Title */}
                      <h3 className="text-xl font-semibold font-montserrat truncate overflow-ellipsis whitespace-nowrap mt-2 mb-2">
                        {item.title}
                      </h3>

                      {/* 🔹 Year */}
                      <div className="mt-1">
                        <Tag
                          className="font-montserrat text-sm w-fit"
                          style={{
                            backgroundColor: "#ED0A00",
                            color: "#FFFFFF",
                            border: "none"
                          }}
                        >
                          {item.year}
                        </Tag>
                      </div>

                      {/* 🔹 Tags inline with label */}
                      <div className="mt-2">
                        <div className="flex items-center gap-x-2">
                          <div
                            className="flex flex-wrap"
                            style={{
                              maxHeight: "48px",
                              overflow: "auto",
                            }}
                          >
                            {(() => {
                              const visibleTags = item.tags.slice(0, 2);
                              const remainingCount = item.tags.length - 2;

                              return (
                                <>
                                  {visibleTags.map((tag) => (
                                    <Tag
                                      key={tag}
                                      className="font-montserrat"
                                      style={{
                                        backgroundColor: "#FFFFFF",
                                        color: "#001641",
                                        borderColor: "#001641",
                                      }}
                                    >
                                      {capitalizeEachWord(tag)}
                                    </Tag>
                                  ))}
                                  {remainingCount > 0 && (
                                    <Tag
                                      className="font-montserrat"
                                      style={{
                                        backgroundColor: "#001641",
                                        color: "#FFFFFF",
                                        borderColor: "#001641",
                                      }}
                                    >
                                      +{remainingCount} more
                                    </Tag>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
            <div className="flex justify-center mt-10 mb-10">
              <Pagination
                current={currentPage}
                pageSize={itemsPerPage}
                total={filteredItems.length}
                onChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-10">No projects found.</div>
        )}
      </div>

      )}
    </div>
  );
}
