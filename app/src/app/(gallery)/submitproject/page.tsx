//Author: 
//Jonty Hourn: Intergration with AWS Amplify
//Yoses Riandy: UI
//Ian Cuchapin: UI Changes
//Description: This is the submit project page for the application. It allows users to submit their projects with details, images, and collaborators.
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Form, Input, Select, Button, Upload, Card, message, DatePicker, Spin, SelectProps, Modal, Image, Tag, Carousel } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { generateClient } from 'aws-amplify/data';
import { type Schema } from "../../../../amplify/data/resource";
import { uploadData } from "aws-amplify/storage";
import debounce from "lodash/debounce";
import ImgCrop from 'antd-img-crop';
import { ArrowLeftOutlined } from "@ant-design/icons";

const client = generateClient<Schema>();

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// DebounceSelect Component
export interface DebounceSelectProps<ValueType = { key?: string; label: React.ReactNode; value: string | number }>
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

// Fetch students from AWS Amplify
async function fetchStudentList(search: string): Promise<{ label: string; value: string }[]> {
  if (!search || search.length < 1) {
    return [];
  }

  const result = await client.models.Student.list({ authMode: "userPool" });

  const lowerSearch = search.toLowerCase();

  const filtered = result.data
    .filter(student => student.email?.toLowerCase().includes(lowerSearch));

  // Optional: prioritize emails starting with the input
  filtered.sort((a, b) => {
    const aStarts = a.email?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    const bStarts = b.email?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    return aStarts - bStarts;
  });

  return filtered.map(student => ({
    label: student.email ?? "",
    value: student.id,
  }));
}

function capitalizeEachWord(text: string): string {
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}


async function fetchTagList(search: string): Promise<{ label: string; value: string }[]> {
  if (!search) return [];

  const result = await client.models.Tags.list(); // no filter
  const lowerSearch = search.toLowerCase();

  // Filter matches
  const filtered = result.data
    .filter(tag => tag.tagName?.toLowerCase().includes(lowerSearch));

  // Sort: startsWith comes first
  filtered.sort((a, b) => {
    const aStarts = a.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    const bStarts = b.tagName?.toLowerCase().startsWith(lowerSearch) ? -1 : 0;
    return aStarts - bStarts;
  });

  return filtered.map(tag => ({
    label: capitalizeEachWord(tag.tagName),
    value: tag.tagName,
  }));
}



export default function SubmitProject() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [image, setImage] = useState<File | null>(null);
  const [OtherImages, setOtherImages] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<string[] | null>(null);

  // Individual rich text states
  const [background, setBackground] = useState("");
  const [technology, setTechnology] = useState("");
  const [benefits, setBenefits] = useState("");
  const [application, setApplication] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<{ label: string; value: string }[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [projectYear, setProjectYear] = useState<string>("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [post, setPost] = useState<postProps>();
  const [resolvedStudents, setResolvedStudents] = useState<string[] | null>(null);

  interface FormValues {
    projectTitle: string;
    projectCategory: string;
  }
  interface postProps {
    projectTitle: string;
    projectYear: string;
    projectBackground: string;
    projectTechnology: string;
    projectBenefits: string;
    projectApplication: string;
    projectTags: string[];
  }

  function showPreview() {
    setPreviewImage([]);
    const post = {
      projectTitle: form.getFieldValue("projectTitle"),
      projectYear: form.getFieldValue("projectYear"),
      projectBackground: background,
      projectTechnology: technology,
      projectBenefits: benefits,
      projectApplication: application,
      projectTags: tags,
    }
    setPost(post);
    const reader = new FileReader();
    if (image) {
      reader.readAsDataURL(image);
      reader.onload = () => {
        if (reader.result) {
          setPreviewImage((prev) => [...(prev || []), reader.result as string]);
        }
      };
    }
    OtherImages.forEach(async (file) => {
      const imageUrl = await getImageUrl(file);
      setPreviewImage((prev) => [...(prev || []), imageUrl]);
    });
    if (selectedStudents.length > 0) {
      const resolvedStudents = selectedStudents.map(async (owner) => {
        const studentDetails = await client.models.Student.get({ id: owner.value }, { authMode: "userPool" });
        return studentDetails.data?.fristName + " " + studentDetails.data?.lastName || "Unknown Name";
      });
      Promise.all(resolvedStudents).then((resolved) => setResolvedStudents(resolved));
    }
    setShowPreviewModal(true);

  }

  function getImageUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const handleSubmit = async (values: FormValues) => {
    if (!background || !technology || !benefits) {
      message.error("Please fill in all of the required fields before submitting.");
      return;
    }

    if (tags.length === 0) {
      message.error("Please select at least one industry tag.");
      return;
    }

    if (!image) {
      message.error("Please upload a cover image before submitting.");
      return;
    }

    const dataToSubmit = {
      ...values,
      projectTags: tags,
      projectYear: projectYear,
      projectBackground: background,
      projectTechnology: technology,
      projectBenefits: benefits,
      projectApplication: application,
      projectStatus: "Pending" as const,
    };

    try {
      const { data: createdProject } = await client.models.Projects.create(dataToSubmit, { authMode: "userPool" });
      const result = await uploadData({
        path: `images/projects/${createdProject?.id ?? ""}/cover`,
        data: image,
      }).result;
      await client.models.Projects.update({
        id: createdProject?.id ?? "",
        ProjectCoverImagePath: result.path,
      }, { authMode: "userPool" });

      const otherImagePaths: string[] = [];
      const uploadedPaths = await Promise.all(
        OtherImages.map(async (file) => {
          const result = await uploadData({
            path: `images/projects/${createdProject?.id ?? ""}/other/${file.name}`,
            data: file,
          }).result;
          return result.path;
        })
      );
      otherImagePaths.push(...uploadedPaths);
      await client.models.Projects.update({
        id: createdProject?.id ?? "",
        projectOtherImagePath: otherImagePaths,
      }, { authMode: "userPool" });

      const studentids = []
      const { data: StudentObj } = await client.models.Student.get({ id: currentUserEmail }, { authMode: "userPool" });
      if (StudentObj) {
        studentids.push(StudentObj.profileOwner);
      }
      await client.models.ProjectsStudents.create({
        projectId: createdProject?.id ?? "",
        studentId: currentUserEmail,
      }, { authMode: "userPool" });
      for (const student of selectedStudents) {

        const { data: StudentObj } = await client.models.Student.get({ id: student.value }, { authMode: "userPool" });
        if (StudentObj) {
          studentids.push(StudentObj.profileOwner);
        }
        await client.models.ProjectsStudents.create({
          projectId: createdProject?.id ?? "",
          studentId: student.value,
        }, { authMode: "userPool" });

      }

      await client.models.Projects.update({
        id: createdProject?.id ?? "",
        projectOwners: studentids.filter((id): id is string => id !== null),
      }, { authMode: "userPool" });
      message.success("Project submitted successfully!");
      setTimeout(() => {
        router.push("/gallery");
      }, 1000); // 1 second delay
    } catch (error) {
      console.error("Error submitting project:", error);
      message.error("Failed to submit project. Please try again.");
      return;
    }

    form.resetFields();
    setBackground("");
    setTechnology("");
    setBenefits("");
    setApplication("");
    setSelectedStudents([]);
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        await getCurrentUser();
        const email = (await fetchUserAttributes())?.email;
        if (email) {
          setCurrentUserEmail(email);
          const userid = await client.models.Student.list({ filter: { email: { eq: email } }, authMode: "userPool" });
          if (userid && userid.data && userid.data.length > 0) {
            setCurrentUserEmail(userid.data[0].id);
          }
        } else {
          console.error("Email is undefined");
        }
      } catch {
        console.log("No user signed in");
        router.push("/signin");
      }
    };
    fetchCurrentUser();
  }, [router]);


  const handleBackButtonClicked = () => {
    router.push("/gallery");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-10">
      <div className="w-full max-w-4xl">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBackButtonClicked}
          className="mb-6"
          style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
        >
          Back
        </Button>
        
      </div>
      <Card className="w-full max-w-4xl p-10" style={{ borderRadius: 0 }}>
        <h1 className="text-4xl font-bold text-blue-700 mb-8 text-center">Submit Your Project</h1>
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-8">
          <Form.Item
            label={<span className="text-xl font-semibold block mb-2">Project Title</span>}
            name="projectTitle"
            rules={[
              { required: true, message: "Please enter the project title!" },
              { max: 30, message: "Title cannot exceed 30 characters!" },
            ]}
          >
            <Input size="large" placeholder="Enter project title (max 30 characters)" maxLength={30} style={{ borderRadius: 0 }} />
          </Form.Item>

          {/* Project Background */}
          <div className="w-full pt-2">
            <label className="text-lg font-semibold block mb-3">
              <span className="text-red-500 mr-1">*</span>
              Project Background
            </label>
            <div className="border border-gray-300 rounded-md">
              <ReactQuill
                theme="snow"
                value={background}
                onChange={setBackground}
                placeholder="Write project background here..."
                style={{ height: "200px" }}
              />
            </div>
          </div>

          {/* Technology Description */}
          <div className="w-full pt-12">
            <label className="text-lg font-semibold block mb-3">
              <span className="text-red-500 mr-1">*</span>
              Technology Description
            </label>
            <div className="border border-gray-300 rounded-md">
              <ReactQuill
                theme="snow"
                value={technology}
                onChange={setTechnology}
                placeholder="Describe the technology used..."
                style={{ height: "200px" }}
              />
            </div>
          </div>

          {/* Project Benefits */}
          <div className="w-full pt-12">
            <label className="text-lg font-semibold block mb-3">
              <span className="text-red-500 mr-1">*</span>
              Project Benefits
            </label>
            <div className="border border-gray-300 rounded-md">
              <ReactQuill
                theme="snow"
                value={benefits}
                onChange={setBenefits}
                placeholder="Explain the benefits..."
                style={{ height: "200px" }}
              />
            </div>
          </div>

          {/* Project Application */}
          <div className="w-full pt-12">
            <label className="text-lg font-semibold block mb-3">
              Project Application
            </label>
            <div className="border border-gray-300 rounded-md">
              <ReactQuill
                theme="snow"
                value={application}
                onChange={setApplication}
                placeholder="How will this be applied?"
                style={{ height: "200px" }}
              />
            </div>
          </div>

          <div className="pt-10">
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
          <Form.Item
            label={
            <span className="text-xl font-semibold block mb-2">
              <span className="text-red-500 mr-1">*</span>Industry Tags (Maximum of 5)
              <span className="ml-2 text-sm text-gray-500">({tags.length}/5 selected)</span>
            </span>}
            rules={[{ required: true, message: "Please select an industry!" }]}
          >
            <DebounceSelect
              mode="multiple"
              className="w-full"
              placeholder="Select Industry"
              fetchOptions={fetchTagList}
              value={tags.map((tag) => ({
                label: capitalizeEachWord(tag),
                value: tag,
              }))}
              onChange={(newValue) => {
                if (Array.isArray(newValue)) {
                  if (newValue.length > 5) {
                    message.warning("You can select up to 5 tags only!");
                    return;
                  }
                  setTags(newValue.map((tag) => tag.value));
                }
              }}
            />

          </Form.Item>

          <Form.Item
            label={<span className="text-xl font-semibold block mb-2">Year of Completion</span>}
            name="projectYear"
            rules={[{ required: true, message: "Please select the project year!" }]}
          >
            <DatePicker
              picker="year"
              placeholder="Select Year"
              className="w-full rounded-none"
              style={{ borderRadius: 0 }}
              size="large"
              format="YYYY"
              disabledDate={(current) => {
                return current && current.year() > new Date().getFullYear();
              }}
              onChange={(date, dateString) => {
                setProjectYear(typeof dateString === "string" ? dateString : "");
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-xl font-semibold block mb-2">
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
                      setImage(file);
                      setPreviewImage((prev) => [reader.result as string, ...(prev?.slice(1) || [])]);
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

            {image && previewImage?.[0] && (
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="relative">
                  <Image
                    src={previewImage[0]}
                    alt="Cover Image"
                    style={{ width: "150px", height: "150px", objectFit: "cover" }}
                  />
                  <Button
                    danger
                    type="text"
                    onClick={() => {
                      setImage(null);
                      setPreviewImage((prev) => prev?.slice(1) || []);
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
              <span className="text-xl font-semibold block mb-2">
                Additional Images
              </span>
            }
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
                      setOtherImages((prev) => [...prev, file]);
                      setPreviewImage((prev) => [...(prev || []), reader.result as string]);
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
              {previewImage?.slice(1).map((img, index) => (
                <div key={index} className="relative">
                  <Image
                    src={img}
                    alt={`Additional Image ${index + 1}`}
                    style={{ width: "150px", height: "150px", objectFit: "cover" }}
                  />
                  <Button
                    danger
                    type="text"
                    onClick={() => {
                      setOtherImages((prev) => prev.filter((_, i) => i !== index));
                      setPreviewImage(() => [
                        previewImage[0], // cover stays
                        ...(previewImage?.slice(1).filter((_, i) => i !== index) || []),
                      ]);
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

          <Form.Item>
            <div className="flex flex-col justify-end sm:flex-row gap-4">
              <Button
                onClick={showPreview}
                style={{ fontWeight: "bold", borderRadius: 0, color: "white", backgroundColor: "#001641", border: "none" }}
              >
                Preview Project
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ fontWeight: "bold", borderRadius: 0, color: "white", backgroundColor: "#0033FF", border: "none" }}
              >
                Submit Project
              </Button>
            </div>
          </Form.Item>
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
        {/* Header with Back and Centered Title */}
        <div className="flex items-center justify-between pb-8 pt-4">
          <div>
            <Button
              onClick={() => setShowPreviewModal(false)}
              className="bg-blue-500 text-white"
              style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
            >
              Back
            </Button>
          </div>
          <div className="text-center w-full absolute left-0 right-0 pointer-events-none">
            <h1 className="text-3xl font-bold text-[#001641] pointer-events-none">
              Preview of your Project
            </h1>
          </div>
          <div style={{ width: "80px" }} /> {/* Spacer to balance layout */}
        </div>

        {/* Hero Section with Title + Carousel */}
        <div className="relative bg-[#001641] w-full h-[550px] overflow-hidden">
          <div className="flex items-start justify-between h-full">
            {/* Left: Title */}
            <div className="flex flex-col justify-center items-start text-white h-full px-6 w-[calc(100%-1000px)]">
              <div>
                <div>
                  {post?.projectTags?.map((tag) => (
                    <Tag key={tag}>{capitalizeEachWord(tag)}</Tag>
                  ))}
                </div>

                <h1 className="text-white text-8xl font-bold mt-4 mb-4">
                  {post?.projectTitle ?? ""}
                </h1>

                <p className="italic mt-2 text-white">
                  Published Year: {projectYear ?? ""}
                </p>
              </div>

              <div className="flex justify-center">
                <div className="mt-16 -mb-16 bg-[#ED0A00] text-white text-xl font-semibold py-4 px-6 flex items-center flex-wrap gap-2" style={{ width: "fit-content" }}>
                  <span>Interested in this project?</span>
                  <span className="underline italic">Click here</span>
                  <span>to connect with the students</span>
                </div>
              </div>
            </div>

            {/* Right: Image Carousel */}
            <div style={{ width: "1000px", height: "550px" }}>
              <Carousel arrows infinite={true} autoplay style={{ height: "100%" }}>
                {previewImage?.map((image, index) => (
                  <div key={index}>
                    <Image
                      src={image}
                      alt={`Project Image ${index + 1}`}
                      style={{ width: "1000px", height: "550px", objectFit: "fill" }}
                    />
                  </div>
                ))}
              </Carousel>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="w-full flex justify-center mt-12">
          <div className="max-w-5xl w-full flex flex-col px-6">
            {post?.projectBackground && (
              <section className="mborder-b mb-4">
                <h1 className="text-[#ED0A00] text-3xl font-bold">Background of the Project</h1>
                <div
                  className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                  dangerouslySetInnerHTML={{ __html: post.projectBackground }}
                />
              </section>
            )}

            {post?.projectTechnology && (
              <section className="border-b mb-4">
                <h1 className="text-[#ED0A00] text-3xl font-bold">Technology Description</h1>
                <div
                  className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                  dangerouslySetInnerHTML={{ __html: post.projectTechnology }}
                />
              </section>
            )}

            {post?.projectBenefits && (
              <section className="mb-4">
                <h1 className="text-[#ED0A00] text-3xl font-bold">Project Benefits</h1>
                <div
                  className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                  dangerouslySetInnerHTML={{ __html: post.projectBenefits }}
                />
              </section>
            )}

            {post?.projectApplication && (
              <section className="mb-4">
                <h1 className="text-[#ED0A00] text-3xl font-bold">Project Applications</h1>
                <div
                  className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                  dangerouslySetInnerHTML={{ __html: post.projectApplication }}
                />
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
