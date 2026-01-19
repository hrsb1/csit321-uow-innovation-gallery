//Author:
//Jonty Hourn: Intergration with AWS Amplify, Project Preview.
//Ian Cuchapin: UI Changes
//Yoses Riandy: UI Changes
//Description: this page is based on the AdminProjectForm with chnages to allow the student to edit their project.
"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Form, Input, Button, Card, message, DatePicker, Select, Spin, SelectProps, Image, Upload, Modal, Tag, Carousel } from "antd";
import { ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import { generateClient } from "aws-amplify/data";
import { useSearchParams } from "next/navigation";
import { type Schema } from "../../../../amplify/data/resource";
import debounce from "lodash/debounce";
import { getUrl, uploadData, remove } from "aws-amplify/storage";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";
import dayjs from "dayjs";

import ImgCrop from "antd-img-crop";
const client = generateClient<Schema>();
type ProjectStudent = Schema["ProjectsStudents"]["type"]

interface ProjectRequestData {
    projectName: string;
    projectBackground: string;
    technologyDescription: string;
    projectBenefits: string;
    projectApplications: string;
    projectTechnology: string;
    projectTags: string[];
    year: string;
    projectCoverImage: string;
    projectCoverImageShortPath?: string;
    approved: Schema["Projects"]["type"]["projectStatus"] | null;
}

interface projectImage {
    projectImagespath: string;
    projectImageShortPath?: string;
    isnew: boolean;
    newFile?: File;
    toDelete: boolean;
}

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

const toCapitalizedOption = (tag: string) => ({
  label: capitalizeEachWord(tag),
  value: tag,
});

async function fetchTagList(search: string): Promise<{ label: string; value: string }[]> {
  const query = search.toLowerCase();

  const result = await client.models.Tags.list({
    filter: { tagName: { contains: query } },
    authMode: "userPool",
  });

  const processed = result.data
    .map((tag) => {
      const raw = tag.tagName ?? "";
      return {
        label: capitalizeEachWord(raw),
        value: raw,
        isPrefix: raw.toLowerCase().startsWith(query),
      };
    })
    .sort((a, b) => {
      if (a.isPrefix && !b.isPrefix) return -1;
      if (!a.isPrefix && b.isPrefix) return 1;
      return a.label.localeCompare(b.label);
    });

  return processed;
}

async function fetchStudentList(search: string): Promise<{ label: string; value: string }[]> {
  if (!search || search.length < 1) return [];

  const lowerQuery = search.toLowerCase();

  const [startsWithResult, containsResult] = await Promise.all([
    client.models.Student.list({
      filter: { email: { beginsWith: lowerQuery } },
      authMode: "userPool",
    }),
    client.models.Student.list({
      filter: { email: { contains: lowerQuery } },
      authMode: "userPool",
    }),
  ]);

  const seen = new Set<string>();
  const merged = [...startsWithResult.data, ...containsResult.data].filter((student) => {
    const email = student.email?.toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  return merged.map((student) => ({
    label: student.email ?? "",
    value: student.id,
  }));
}
// do not remove Suspense 
const outerEditProjct: React.FC = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditProject />
        </Suspense>
    );
}

const EditProject: React.FC = () => {
    const [data, setData] = useState<ProjectRequestData | null>(null);
    const searchParams = useSearchParams();
    const projectid = searchParams?.get("projectId") || "";
    const [tags, setTags] = useState<string[]>([]);
    const [toUploadCover, setToUploadCover] = useState<File | null>(null);
    const [upadedCover, setUpdatedCover] = useState<boolean>(false);
    const [images, setImages] = useState<projectImage[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<{ label: string; value: string }[]>([]);
    const [oldStudents, setOldStudents] = useState<ProjectStudent[]>([]);
    const [previewImage, setPreviewImage] = useState<string[] | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [resolvedStudents, setResolvedStudents] = useState<string[] | null>(null);
    const [modAcknowledge, setModAcknowledge] = useState(false);

    const fetchProjectData: () => Promise<void> = React.useCallback(async (): Promise<void> => {
        const response = await client.models.Projects.get({ id: projectid }, { authMode: "userPool" });
        const project = response.data;
        if (!project) {
            console.error("Project data is null");
            return;
        }

        setData({
            projectName: project.projectTitle ?? "",
            projectBackground: project.projectBackground ?? "",
            technologyDescription: project.projectTechnology ?? "",
            projectBenefits: project.projectBenefits ?? "",
            projectApplications: project.projectApplication ?? "",
            projectTags: (project.projectTags ?? [" Uncategorized"]).filter((tag): tag is string => tag !== null),
            year: project.projectYear ?? "",
            projectTechnology: project.projectTechnology ?? "",
            approved: project.projectStatus ?? null,
            projectCoverImage: project.ProjectCoverImagePath
                ? (await getUrl({ path: project.ProjectCoverImagePath })).url.toString()
                : "",
        });
        const studentData = await Promise.all(
            (await project.students()).data.map(async (student) => {
                const studentDetails = await client.models.Student.get({ id: student.studentId }, { authMode: "userPool" });
                return {
                    label: studentDetails.data?.email || "Unknown Email",
                    value: student.studentId,
                };
            })
        );
        setSelectedStudents(studentData);
        setOldStudents((await project.students()).data);
        setTags((project.projectTags ?? [" Uncategorized"]).filter((tag): tag is string => tag !== null));
        if (project.projectOtherImagePath) {
            const imagePromises = project.projectOtherImagePath.map(async (image, index) => ({
                projectImagespath: await getUrl({ path: image as string }).then((res) => res.url.toString()),
                projectImageShortPath: project.projectOtherImagePath ? project.projectOtherImagePath[index] ?? "" : "",
                isnew: false,
                toDelete: false,
            }));
            const resolvedImages = await Promise.all(imagePromises);
            setImages(resolvedImages);
        }
    }, [projectid]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    if (!searchParams) {
        return <div>Loading...</div>;
    }

    const handleBackButtonClicked = () => {
        window.history.back();
    };

    const stripHtml = (input: string): string => {
      const tmp = document.createElement("div");
      tmp.innerHTML = input;
      return tmp.textContent?.trim() || "";
    };

    const validateFields = (): boolean => {
      if (!data) return false;

      if (!data.projectName?.trim()) {
        message.error("Project title is required.");
        return false;
      }

      if (!stripHtml(data.projectBackground)) {
        message.error("Project background is required.");
        return false;
      }

      if (!stripHtml(data.technologyDescription)) {
        message.error("Technology description is required.");
        return false;
      }

      if (!stripHtml(data.projectBenefits)) {
        message.error("Project benefits are required.");
        return false;
      }

      if (!data.year?.trim()) {
        message.error("Year of completion is required.");
        return false;
      }

      if (!tags.length) {
        message.error("At least one industry tag is required.");
        return false;
      }

      if (!toUploadCover && !data.projectCoverImage) {
        message.error("Cover image is required.");
        return false;
      }

      return true;
    };

    const onSaveChanges = async () => {
      if (!validateFields()) return; // ✅ stop if invalid

      if (!modAcknowledge) {
        message.error("You must acknowledge the warning before saving.");
        return;
      }
      
        const filePaths: string[] = [];
        for (const image of images) {
            if (image.isnew) {
                if (!image.toDelete) {
                    if (image.newFile) {
                        const results = await uploadData({
                            path: `images/projects/${projectid}/other/${image.projectImageShortPath}`,
                            data: image.newFile,
                        }).result;
                        filePaths.push(results.path);
                    }

                }
            }
            else if (image.toDelete) {
                if (!image.isnew) {
                    if (image.projectImageShortPath) {
                        await remove({ path: image.projectImageShortPath });
                    }
                }
            }
            else {
                filePaths.push(image.projectImageShortPath || "");
            }
        }
        if (upadedCover) {
            if (data?.projectCoverImageShortPath) {
                await remove({ path: data.projectCoverImageShortPath });
            }
            if (toUploadCover) {
                const result = await uploadData({
                    path: `images/projects/${projectid}/cover`,
                    data: toUploadCover,
                }).result;
                data!.projectCoverImageShortPath = result.path;
            }
        }
        for (const student of oldStudents) {
            if (selectedStudents.find((s) => s.value === student.studentId) === undefined) {
                await client.models.ProjectsStudents.delete(
                    student, { authMode: "userPool" }
                );
                oldStudents.splice(oldStudents.indexOf(student), 1);
            }
        }
        for (const student of selectedStudents) {
            if (oldStudents.find((s) => s.studentId === student.value) === undefined) {
                const obj = await client.models.ProjectsStudents.create({
                    projectId: projectid,
                    studentId: student.value,
                }, { authMode: "userPool" });
                if (obj.data) {
                    oldStudents.push(obj.data);
                }
            }
        }
        const ProjectStudent = [""]
        for (const student of oldStudents) {
            const studentDetails = await client.models.Student.get({ id: student.studentId }, { authMode: "userPool" });
            if (studentDetails.data?.profileOwner) {
                ProjectStudent.push(studentDetails.data.profileOwner);
            }
        }

        if (data?.approved === "Approved") {
            data.approved = "PendingEdit";
        }

        if (!data) return;
        await client.models.Projects.update(
            {
                id: projectid,
                projectTitle: data.projectName,
                projectBackground: data.projectBackground,
                projectTechnology: data.technologyDescription,
                projectBenefits: data.projectBenefits,
                projectApplication: data.projectApplications,
                projectTags: tags,
                projectYear: data.year,
                ProjectCoverImagePath: data.projectCoverImageShortPath,
                projectOtherImagePath: filePaths,
                projectOwners: ProjectStudent,
                projectStatus: data.approved,
            },
            { authMode: "userPool" }
        );
        message.success("Changes saved successfully!");
        
        setTimeout(() => {
          window.history.back();
        }, 1000);
    };



    if (!data) {
        return <div>Loading...</div>;
    }
    function showPreview() {
        setPreviewImage([]);
        setPreviewImage(data?.projectCoverImage ? [data?.projectCoverImage] : []);
        setPreviewImage((prev) => [...(prev || []), ...images.map((image) => image.projectImagespath)]);
        if (selectedStudents.length > 0) {
            const resolvedStudents = selectedStudents.map(async (owner) => {
                const studentDetails = await client.models.Student.get({ id: owner.value }, { authMode: "userPool" });
                return studentDetails.data?.fristName + " " + studentDetails.data?.lastName || "Unknown Name";
            });
            Promise.all(resolvedStudents).then((resolved) => setResolvedStudents(resolved));
        }
        setShowPreviewModal(true);
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100 p-10">
            <div className="w-full max-w-4xl flex justify-between mb-4"> 
              <Button
                icon={<ArrowLeftOutlined />}
                  onClick={handleBackButtonClicked}
                  className="mb-4"
                  style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                >
                  Back
              </Button>
            </div>
            <Card className="w-full max-w-4xl p-10" style={{ borderRadius: 0 }}>
                <h1 className="text-4xl font-bold text-blue-700 mb-8 text-center">Project Request Form</h1>
                <Form layout="vertical" className="space-y-8">
                    {/* Project Title */}
                    <Form.Item label={
                      <span className="text-lg font-semibold block mb-2">
                        <span className="text-red-500 mr-1">*</span>
                        Project Title
                      </span>
                    }>
                      <Input
                        size="large"
                        value={data.projectName}
                        placeholder="Enter project title (max 30 characters)"
                        maxLength={30}
                        style={{ borderRadius: 0 }}
                        onChange={(e) => setData((prev) => ({ ...prev!, projectName: e.target.value }))}
                      />
                    </Form.Item>

                    <div className="w-full">
                      <label className="text-lg font-semibold block mb-3">
                        <span className="text-red-500 mr-1">*</span>
                        Project Background
                      </label>
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectBackground}
                          onChange={(value) =>
                            setData((prev) => ({ ...prev!, projectBackground: value }))
                          }
                          placeholder="Write project background here..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    </div>

                    <div className="w-full pt-8">
                      <label className="text-lg font-semibold block mb-3">
                        <span className="text-red-500 mr-1">*</span>
                        Technology Description
                      </label>
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.technologyDescription}
                          onChange={(value) =>
                            setData((prev) => ({ ...prev!, technologyDescription: value }))
                          }
                          placeholder="Describe the technology used..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    </div>

                    <div className="w-full pt-8">
                      <label className="text-lg font-semibold block mb-3">
                        <span className="text-red-500 mr-1">*</span>
                        Project Benefits
                      </label>
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectBenefits}
                          onChange={(value) =>
                            setData((prev) => ({ ...prev!, projectBenefits: value }))
                          }
                          placeholder="Explain the benefits..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    </div>

                    <div className="w-full pt-8">
                      <label className="text-lg font-semibold block mb-3">
                        Project Applications
                      </label>
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectApplications}
                          onChange={(value) =>
                            setData((prev) => ({ ...prev!, projectApplications: value }))
                          }
                          placeholder="How will this be applied?"
                          style={{ height: "200px" }}
                        />
                      </div>
                    </div>

                    {/* Project Collaborators */}
                    <div className="pt-8">
                      <span className="text-lg font-semibold block mb-2">
                        Project Collaborators
                      </span>
                      <p className="text-gray-500 text-sm">
                        Search Collaborators by email to collaborate on this project. You can add multiple Collaborators.
                        <br />
                        You do not need to add yourself.
                      </p>
                    </div>

                    <Form.Item className="!mt-2 !mb-0">
                      <DebounceSelect
                        mode="multiple"
                        className="w-full"
                        value={selectedStudents}
                        placeholder="Search and select students"
                        fetchOptions={fetchStudentList}
                        onChange={(newValue) => {
                          if (Array.isArray(newValue)) {
                            setSelectedStudents(newValue);
                          }
                        }}
                      />
                    </Form.Item>

                    {/* Industry Tags */}
                    <Form.Item
                      label={
                        <span className="text-lg font-semibold block mb-2">
                          <span className="text-red-500 mr-1">*</span>
                          Industry Tags (max 5)
                          <span className="ml-2 text-sm text-gray-500">({tags.length}/5 selected)</span>
                        </span>
                      }
                    >
                      <DebounceSelect
                        mode="multiple"
                        className="w-full"
                        placeholder="Select Industry"
                        fetchOptions={fetchTagList}
                        value={tags.map(toCapitalizedOption)}
                        onChange={(newValue) => {
                          if (Array.isArray(newValue)) {
                            if (newValue.length > 5) {
                              message.warning("You can select up to 5 tags only!");
                              return;
                            }
                            setTags(newValue.map((tag) => tag.value));
                            setData((prev) => ({ ...prev!, projectTags: newValue.map((tag) => tag.value) }));
                          }
                        }}
                      />
                    </Form.Item>

                    {/* Year of Completion */}
                    <Form.Item
                      label={
                        <span className="text-lg font-semibold block mb-2">
                          <span className="text-red-500 mr-1">*</span>
                          Year of Completion
                        </span>
                      }
                    >
                      <DatePicker
                        picker="year"
                        placeholder="Select Year"
                        className="w-full"
                        style={{ borderRadius: 0 }}
                        size="large"
                        format="YYYY"
                        value={data.year ? dayjs(data.year, "YYYY") : null}
                        defaultPickerValue={dayjs(data.year || new Date().getFullYear().toString(), 'YYYY')}
                        disabledDate={(current) => current && current.year() > new Date().getFullYear()}
                        onChange={(date, dateString) => {
                          const value = typeof dateString === "string" ? dateString : "";
                          setData((prev) => ({ ...prev!, year: value }));
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      label={
                        <span className="text-lg font-semibold block mb-2">
                          <span className="text-red-500 mr-1">*</span>Upload Cover Image
                        </span>
                      }
                    >
                      <ImgCrop aspect={2} showReset>
                        <Upload
                          beforeUpload={(file) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => {
                              if (reader.result) {
                                setToUploadCover(file);
                                setUpdatedCover(true);
                                setData((prev) => ({
                                  ...prev!,
                                  projectCoverImage: reader.result as string,
                                }));
                              }
                            };
                            return false;
                          }}
                          maxCount={1}
                          showUploadList={false}
                        >
                          <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 0 }}>
                            Click to Upload
                          </Button>
                        </Upload>
                      </ImgCrop>

                      {data?.projectCoverImage && (
                        <div className="flex flex-wrap gap-4 mt-4">
                          <div className="relative">
                            <Image
                              src={data.projectCoverImage}
                              alt="Cover Image"
                              style={{ width: "150px", height: "150px", objectFit: "cover" }}
                            />
                            <Button
                              danger
                              type="text"
                              onClick={() => {
                                setToUploadCover(null);
                                setUpdatedCover(true);
                                setData((prev) => ({
                                  ...prev!,
                                  projectCoverImage: "",
                                  projectCoverImageShortPath: "", // Optional cleanup
                                }));
                              }}
                              style={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                background: "rgba(255, 255, 255, 0.8)",
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.Item>
                    <Form.Item
                      label={
                        <span className="text-lg font-semibold block mb-2">Additional Images</span>
                      }
                      className="!mt-10"
                    >
                      <ImgCrop aspect={2} showReset>
                        <Upload
                          multiple
                          showUploadList={false}
                          beforeUpload={(file) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => {
                              if (reader.result) {
                                setImages((prev) => [
                                  ...prev,
                                  {
                                    projectImagespath: reader.result as string,
                                    projectImageShortPath: file.name,
                                    isnew: true,
                                    newFile: file,
                                    toDelete: false,
                                  },
                                ]);
                              }
                            };
                            return false;
                          }}
                        >
                          <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 0 }}>
                            Click to Upload
                          </Button>
                        </Upload>
                      </ImgCrop>

                      <div className="flex flex-wrap gap-4 mt-4">
                        {images.map((image, index) => (
                          <div key={index} className="relative">
                            <Image
                              src={image.projectImagespath}
                              alt={`Project Image ${index + 1}`}
                              style={{ width: "150px", height: "150px", objectFit: "cover" }}
                            />
                            <Button
                              danger
                              type="text"
                              onClick={() => {
                                setImages((prev) => prev.filter((_, i) => i !== index));
                              }}
                              style={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                background: "rgba(255, 255, 255, 0.8)",
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Form.Item>

                </Form>
                <div className="flex gap-4 mt-8 justify-start">
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-2 flex items-center gap-3 max-w-5xl w-full">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={modAcknowledge}
                      onChange={(e) => setModAcknowledge(e.target.checked)}
                    />
                    <p className="text-sm font-medium text-left">
                      I understand that saving changes will remove this project from the gallery until it is approved again by MOD.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-10">
                    <Button onClick={showPreview}
                      style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#001641" }}  
                    >
                      Preview Project
                    </Button>
                    <div className="flex gap-4">
                      <Button onClick={() => {window.history.back(); }}
                        style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#ED0A00" }}
                      >
                          Cancel
                      </Button>
                      <Button type="primary" onClick={onSaveChanges}
                        style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                      >
                          Save Changes
                      </Button>
                    </div>
                </div>
            </Card>
            <Modal
              title={null}
              open={showPreviewModal}
              onCancel={() => setShowPreviewModal(false)}
              footer={null}
              width={"100%"}
              style={{ top: 20 }}
            >
              <div className="flex items-center justify-between pb-8 pl-4 pt-4">
                {/* Left: Back Button */}
                <div>
                  <Button
                    onClick={() => setShowPreviewModal(false)}
                    className="bg-blue-500 text-white"
                    style={{ backgroundColor: "#001641", color: "white", border: "none" }}
                  >
                    Back
                  </Button>
                </div>

                {/* Center: Title */}
                <div className="text-center w-full absolute left-0 right-0 pointer-events-none">
                  <h1 className="text-3xl font-bold text-[#001641] pointer-events-none">
                    Preview Project
                  </h1>
                </div>

                {/* Right: Empty to keep spacing symmetrical */}
                <div style={{ width: "80px" }} />
              </div>
              <div className="relative bg-[#001641] w-full h-[550px] overflow-hidden">
                <div className="flex items-start justify-between h-full">
                  {/* Left: Title Section */}
                  <div className="flex flex-col justify-center items-start text-white h-full px-6 w-[calc(100%-1000px)]">
                    <div>
                      <div>
                        {(data?.projectTags ?? [])
                          .filter((tag): tag is string => tag !== null)
                          .map((tag) => (
                            <Tag key={tag}>{capitalizeEachWord(tag)}</Tag>
                        ))}
                      </div>

                      <h1 className="text-white text-8xl font-bold mt-4 mb-4">
                        {data?.projectName ?? ""}
                      </h1>

                      <p className="italic mt-2 text-white">
                        Published Year: {data?.year ?? ""}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div
                        className="mt-16 -mb-16 bg-[#ED0A00]  text-white text-xl font-semibold py-4 px-6 flex items-center flex-wrap gap-2"
                        style={{ width: "fit-content" }}
                      >
                        <span>Interested in this project?</span>
                        <span className="underline italic">Connect with the students</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Carousel */}
                  <div style={{ width: "1000px", height: "550px" }}>
                    <Carousel arrows infinite={true} autoplay style={{ height: "100%" }}>
                      {previewImage?.map((image, index) => (
                        <div key={index}>
                          <Image
                            src={image}
                            alt={`Project Image ${index + 1}`}
                            style={{
                              width: "1000px",
                              height: "550px",
                              objectFit: "fill",
                            }}
                          />
                        </div>
                      ))}
                    </Carousel>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="w-full flex justify-center mt-12">
                <div className="max-w-5xl w-full flex flex-col px-6">
                  {data?.projectBackground && (
                    <section className="mborder-b mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">
                        Background of the Project
                      </h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.projectBackground }}
                      ></div>
                    </section>
                  )}

                  {data?.technologyDescription  && (
                    <section className="border-b mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">
                        Technology Description
                      </h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.technologyDescription  }}
                      ></div>
                    </section>
                  )}

                  {data?.projectBenefits && (
                    <section className="mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">Project Benefits</h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.projectBenefits }}
                      ></div>
                    </section>
                  )}

                  {stripHtml(data?.projectApplications || "") && (
                    <section className="mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">Project Applications</h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{
                          __html: data.projectApplications || "",
                        }}
                      ></div>
                    </section>
                  )}

                  <section className="border-b mb-4">
                    <h1 className="text-[#ED0A00] text-3xl font-bold">Project Collaborators</h1>
                    <ul className="list-disc pl-4 text-lg mt-2 text-[#001641]">
                      {resolvedStudents?.map((student, index) => (
                        <li key={index} className="mt-2">
                          {student}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </Modal>
        </div>

    );
}
export default outerEditProjct;