//Author:
//Ian Cuchapin, Yoses Riandy: UI
//Jonty Hourn: Intergration with AWS Amplify, preview functionality
// Description: Admin Project Form for modrating and editing project submissions
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Form, Input, Button, Card, message, DatePicker, Select, Spin, SelectProps, Carousel, Image, Upload, Modal, Tag, Popconfirm } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { generateClient } from "aws-amplify/data";
import { useSearchParams } from "next/navigation";
import { type Schema } from "../../../../amplify/data/resource";
import debounce from "lodash/debounce";
import { getUrl, uploadData, remove } from "aws-amplify/storage";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import { UploadOutlined } from "@ant-design/icons";
import dayjs from 'dayjs';

import ImgCrop from "antd-img-crop";
const client = generateClient<Schema>();
type Project = Schema["Projects"]["type"];
type ProjectStudent = Schema["ProjectsStudents"]["type"]


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
  label: tag
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
  value: tag,
});

async function fetchTagList(search: string): Promise<{ label: string; value: string }[]> {
    const query = search.toLowerCase();

    const result = await client.models.Tags.list({
        filter: { tagName: { contains: query } },
        authMode: "userPool"
    });

    const processed = result.data
    .map((tag) => {
      const raw = tag.tagName ?? "";
      const capitalized = raw
        .split(" ")
        .map(word => word.trim().toLowerCase())
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return {
        label: capitalized,
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
    if (!search || search.length < 1) {
        return [];
    }

    const [startsWithResult, containsResult] = await Promise.all([
        client.models.Student.list({
            filter: { email: { beginsWith: search.toLowerCase() } },
            authMode: "userPool"
        }),
        client.models.Student.list({
            filter: { email: { contains: search.toLowerCase() } },
            authMode: "userPool"
        })
    ]);

    const seen = new Set<string>();
    const mergeAndDedup = [...startsWithResult.data, ...containsResult.data].filter((student) => {
        if (!student.email || seen.has(student.email)) return false;
        seen.add(student.email);
        return true;
    });

    return mergeAndDedup.map((student) => ({
        label: student.email ?? "",
        value: student.id,
    }));
}

const ProjectRequestForm: React.FC = () => {
    const [data, setData] = useState<Project | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const searchParams = useSearchParams();
    const projectid = searchParams.get("projectId") || "";
    const [tags, setTags] = useState<string[]>([]);
    const [imagepathShourtPath, setImagepathShortPath] = useState<string>();
    const [toUploadCover, setToUploadCover] = useState<File | null>(null);
    const [upadedCover, setUpdatedCover] = useState<boolean>(false);
    const [images, setImages] = useState<projectImage[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<{ label: string; value: string }[]>([]);
    const [oldStudents, setOldStudents] = useState<ProjectStudent[]>([]);
    const router = useRouter();
    const [previewImage, setPreviewImage] = useState<string[] | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [resolvedStudents, setResolvedStudents] = useState<string[] | null>(null);
    const fetchProjectData: () => Promise<void> = React.useCallback(async (): Promise<void> => {
        const response = await client.models.Projects.get({ id: projectid }, { authMode: "userPool" });
        const project = response.data;
        if (!project) {
            console.error("Project data is null");
            return;
        }

        setData(project);

        if (project.ProjectCoverImagePath) {
            setImagepathShortPath(project.ProjectCoverImagePath);
            const coverImageUrl = (await getUrl({ path: project.ProjectCoverImagePath })).url.toString();
            setData((prev) => ({
                ...prev!,
                ProjectCoverImagePath: coverImageUrl,
            }));
        }
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

    const handleBackButtonClicked = () => {
        window.history.back();
    };

    const onReject = async () => {
        const reason = await new Promise<string>((resolve) => {
            let localReason = "";
            Modal.confirm({
                title: "Rejection Reason",
                content: (
                    <Input.TextArea
                        placeholder="Please provide a reason for rejection"
                        rows={4}
                        onChange={(e) => {
                            localReason = e.target.value;
                        }}
                    />
                ),
                onOk: () => resolve(localReason),
                onCancel: () => resolve(""),
            });
        });

        if (!reason) {
            message.warning("Rejection reason is required.");
            return;
        }

        await client.models.Projects.update(
            { id: projectid, projectStatus: "Rejected", projedctRejectReason: reason } as const,
            { authMode: "userPool" }
        );
        message.success("Project rejected successfully!");
        window.history.back();
    };

    const onApprove = async () => {
        await client.models.Projects.update(
            { id: projectid, projectStatus: "Approved" },
            { authMode: "userPool" }
        );
        message.success("Project approved successfully!");
        window.history.back();
    };

    const validateFields = (): boolean => {
      if (!data) return false;

      if (!data.projectTitle?.trim()) {
        message.error("Project title is required.");
        return false;
      }
      if (!data.projectBackground?.trim()) {
        message.error("Project background is required.");
        return false;
      }
      if (!data.projectTechnology?.trim()) {
        message.error("Technology description is required.");
        return false;
      }
      if (!data.projectBenefits?.trim()) {
        message.error("Project benefits are required.");
        return false;
      }
      if (!data.projectYear?.trim()) {
        message.error("Year of completion is required.");
        return false;
      }
      if (!tags.length) {
        message.error("At least one industry tag is required.");
        return false;
      }
      if (!toUploadCover && !data.ProjectCoverImagePath) {
        message.error("Cover image is required.");
        return false;
      }

      return true;
    };


    const onSaveChanges = async () => {
        if (!validateFields()) return; // ✅ stop if invalid
        setIsEditMode(false); // already exists ✅
        // Optionally scroll to top:
        window.scrollTo({ top: 0, behavior: "smooth" });
        let upadateCoverURL = "";
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
            if (imagepathShourtPath) {
                await remove({ path: imagepathShourtPath });
                console.log("marko");
            }
            if (toUploadCover) {
                const result = await uploadData({
                    path: `images/projects/${projectid}/cover/${toUploadCover.name}`,
                    data: toUploadCover,
                }).result;
                if (result) {
                    upadateCoverURL = result.path;
                }


            }
        }
        else {
            upadateCoverURL = imagepathShourtPath || "";
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






        if (!data) return;
        await client.models.Projects.update(
            {
                id: projectid,
                projectTitle: data.projectTitle,
                projectBackground: data.projectBackground,
                projectTechnology: data.projectTechnology,
                projectBenefits: data.projectBenefits,
                projectApplication: data.projectApplication,
                projectTags: tags,
                projectYear: data.projectYear,
                projectStatus: data.projectStatus,
                projectOtherImagePath: filePaths,
                projectOwners: ProjectStudent,
                ProjectCoverImagePath: upadateCoverURL,
            },
            { authMode: "userPool" }
        );
        message.success("Changes saved successfully!");
        setUpdatedCover(false);
        await fetchProjectData();
    };

    function showPreview() {
        setPreviewImage([]);
        setPreviewImage(data?.ProjectCoverImagePath ? [data.ProjectCoverImagePath] : null);
        setPreviewImage((prev) => [...(prev || []), ...images.map((image) => image.projectImagespath)]);
        setShowPreviewModal(true);
        if (selectedStudents.length > 0) {
            const resolvedStudents = selectedStudents.map(async (owner) => {
                const studentDetails = await client.models.Student.get({ id: owner.value }, { authMode: "userPool" });
                return studentDetails.data?.fristName + " " + studentDetails.data?.lastName || "Unknown Name";
            });
            Promise.all(resolvedStudents).then((resolved) => setResolvedStudents(resolved));
        }
    }
    if (!data) {
        return <div>Loading...</div>;
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
            <Button onClick={() => router.push(`/gallery/${projectid}`)} disabled={isEditMode}
              style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#001641" }}  
            >
              View Project
            </Button>
          </div>
            <Card className="w-full max-w-4xl p-10" style={{ borderRadius: 0 }}>

              {!isEditMode && (
                <div className="flex justify-end">
                  <Button icon={<EditOutlined />} onClick={() => setIsEditMode(true)}
                    style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                  >
                    Edit
                  </Button>
                </div>
              )}

                <h1 className="text-4xl font-bold text-blue-700 mb-8 text-center">
                  {isEditMode ? "Edit Project Submission" : "View Project Submission"}
                </h1>
                <Form layout="vertical" className="space-y-8">
                  
                  <Form.Item 
                    label={
                      <span className="text-lg font-semibold block">
                        Status
                      </span>
                    }>
                    <Tag color={data.projectStatus === "Rejected" ? "red" : "blue"}>
                      {data.projectStatus}
                    </Tag>
                  </Form.Item>

                  {data.projectStatus === "Rejected" && (
                    <Form.Item label={<span className="font-bold text-xl">Rejection Reason</span>}>
                      <p>{data.projectStatus}</p>
                    </Form.Item>
                  )}

                  {/* Project Title */}
                  <Form.Item
                    label={
                      <span className="text-lg font-semibold block mb-2">
                        <span className="text-red-500 mr-1">*</span>
                        Project Title
                      </span>
                    }
                  >
                    {isEditMode ? (
                      <Input
                        size="large"
                        value={data.projectTitle || ""}
                        placeholder="Enter project title (max 30 characters)"
                        maxLength={30}
                        style={{ borderRadius: 0 }}
                        onChange={(e) => setData({ ...data, projectTitle: e.target.value })}
                      />
                    ) : (
                      <p className="text-base">{data.projectTitle}</p>
                    )}
                  </Form.Item>

                  {/* Project Background */}
                  <div className="w-full">
                    <label className="text-lg font-semibold block mb-3">
                      <span className="text-red-500 mr-1">*</span>
                      Project Background
                    </label>
                    {isEditMode ? (
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data?.projectBackground ?? ""}
                          onChange={(value) => {
                            if (!data) return;
                            setData((prev) => ({ ...prev!, projectBackground: value }));
                          }}
                          placeholder="Write project background here..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: data.projectBackground ?? "" }}
                      />
                    )}
                  </div>

                  {/* Technology Description */}
                  <div className="w-full pt-8">
                    <label className="text-lg font-semibold block mb-3">
                      <span className="text-red-500 mr-1">*</span>
                      Technology Description
                    </label>
                    {isEditMode ? (
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectTechnology ?? ""}
                          onChange={(value) => {
                            if (!data) return;
                            setData((prev) => ({ ...prev!, projectTechnology: value }));
                          }}
                          placeholder="Describe the technology used..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: data.projectTechnology ?? "" }}
                      />
                    )}
                  </div>

                  {/* Project Benefits */}
                  <div className="w-full pt-8">
                    <label className="text-lg font-semibold block mb-3">
                      <span className="text-red-500 mr-1">*</span>
                      Project Benefits
                    </label>
                    {isEditMode ? (
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectBenefits ?? ""}
                          onChange={(value) => {
                            if (!data) return;
                            setData((prev) => ({ ...prev!, projectBenefits: value }));
                          }}
                          placeholder="Explain the benefits..."
                          style={{ height: "200px" }}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: data.projectBenefits ?? "" }}
                      />
                    )}
                  </div>

                  {/* Project Application */}
                  <div className="w-full pt-8">
                    <label className="text-lg font-semibold block mb-3">
                      Project Application
                    </label>
                    {isEditMode ? (
                      <div className="border border-gray-300 rounded-md">
                        <ReactQuill
                          theme="snow"
                          value={data.projectApplication ?? ""}
                          onChange={(value) => {
                            if (!data) return;
                            setData((prev) => ({ ...prev!, projectApplication: value }));
                          }}
                          placeholder="How will this be applied?"
                          style={{ height: "200px" }}
                        />
                      </div>
                    ) : (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: data.projectApplication ?? "" }}
                      />
                    )}
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
                      {isEditMode ? (
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
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          {selectedStudents.map((student) => (
                            <p key={student.value}>{student.label}</p>
                          ))}
                        </div>
                      )}
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
                      {isEditMode ? (
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
                              setData({ ...data, projectTags: newValue.map((tag) => tag.value) });
                            }
                          }}
                        />
                      ) : (
                        <p>
                          {(data.projectTags ?? [])
                            .filter((tag): tag is string => tag !== null)
                            .map(tag => toCapitalizedOption(tag).label)
                            .join(", ")}
                        </p>
                      )}
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
                      {isEditMode ? (
                        <DatePicker
                          picker="year"
                          placeholder="Select Year"
                          className="w-full"
                          style={{ borderRadius: 0 }}
                          size="large"
                          format="YYYY"
                          value={data.projectYear ? dayjs(data.projectYear, 'YYYY') : null}
                          defaultPickerValue={dayjs(data.projectYear || new Date().getFullYear().toString(), 'YYYY')}
                          disabledDate={(current) => {
                            const year = current.year();
                            return year > new Date().getFullYear();
                          }}
                          onChange={(date, dateString) =>
                            setData({ ...data, projectYear: typeof dateString === "string" ? dateString : "" })
                          }
                        />
                      ) : (
                        <p>{data.projectYear}</p>
                      )}
                    </Form.Item>

                    {/* Upload Cover Image */}
                    <Form.Item
                      label={
                        <span className="text-lg font-semibold block mb-2">
                          <span className="text-red-500 mr-1">*</span> Upload Cover Image
                        </span>
                      }
                    >
                      {isEditMode ? (
                        <>
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
                                      ProjectCoverImagePath: reader.result as string,
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

                          {data?.ProjectCoverImagePath && (
                            <div className="flex flex-wrap gap-4 mt-4">
                              <div className="relative">
                                <Image
                                  src={data.ProjectCoverImagePath}
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
                                      ProjectCoverImagePath: "",
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
                        </>
                      ) : (
                        data?.ProjectCoverImagePath && (
                          <Image
                            src={data.ProjectCoverImagePath}
                            alt="Cover Image"
                            style={{ width: "100%", height: "450px", objectFit: "fill" }}
                          />
                        )
                      )}
                    </Form.Item>

                    {/* Additional Images */}
                    <Form.Item
                    label={
                      <span className="text-lg font-semibold block mb-2">Additional Images</span>
                    }
                    className="!mt-10"
                  >
                    {isEditMode ? (
                      <>
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
                                type="text"
                                danger
                                onClick={() =>
                                  setImages((prev) => prev.filter((_, i) => i !== index))
                                }
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
                      </>
                    ) : (
                      <Carousel arrows infinite={true} autoplay>
                        {images.map((image, index) => (
                          <div key={index}>
                            <Image
                              src={image.projectImagespath}
                              alt={`Project Image ${index + 1}`}
                              style={{ width: "100%", height: "450px", objectFit: "fill" }}
                            />
                          </div>
                        ))}
                      </Carousel>
                    )}
                  </Form.Item>

                    {isEditMode ? (
                      <div className="flex justify-between items-center mt-10">
                        <div className="flex gap-4">
                        <Button onClick={showPreview}
                          style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#001641" }}  
                        >
                          Preview Project
                        </Button>
                        <Popconfirm
                          title="Are you sure you want to Delete this project?"
                          onConfirm={async () => {
                            if (imagepathShourtPath) {
                              await remove({ path: imagepathShourtPath });
                            }
                            for (const image of images) {
                              if (image.projectImageShortPath) {
                                await remove({ path: image.projectImageShortPath });
                              }
                            }
                            await client.models.Projects.delete({ id: projectid }, { authMode: "userPool" });
                            message.success("Project deleted successfully!");
                            window.history.back();
                          }}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button danger type="primary"
                            style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#ED0A00" }}  
                          >
                            Delete Project
                          </Button>
                        </Popconfirm>
                        </div>
                        <div className="flex gap-4">
                          <Button onClick={() => { setIsEditMode(false); fetchProjectData(); }}
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
                    ) : (
                      <div className="flex justify-center gap-4 mt-10">
                        <Button danger type="primary" onClick={onReject}
                          style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#ED0A00" }}
                        >
                          Reject
                        </Button>
                        <Button type="primary" onClick={onApprove}
                          style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                        >
                          Approve
                        </Button>
                      </div>
                    )}

                    {!isEditMode && (
                      <div className="flex justify-end mt-6">
                        <Button icon={<EditOutlined />} onClick={() => setIsEditMode(true)}
                          style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                </Form>
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
                        {data?.projectTitle ?? ""}
                      </h1>

                      <p className="italic mt-2 text-white">
                        Published Year: {data?.projectYear ?? ""}
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

                  {data?.projectBenefits && (
                    <section className="mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">Project Benefits</h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.projectBenefits }}
                      ></div>
                    </section>
                  )}

                  {data?.projectTechnology && (
                    <section className="border-b mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">
                        Technology Description
                      </h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.projectTechnology }}
                      ></div>
                    </section>
                  )}

                  {data?.projectApplication && (
                    <section className="mb-4">
                      <h1 className="text-[#ED0A00] text-3xl font-bold">
                        Project Applications
                      </h1>
                      <div
                        className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: data.projectApplication }}
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
export default ProjectRequestForm;
