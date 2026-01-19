//Author: 
//Jonty Hourn: Intergration with AWS AMPLIFY
//Ian Cuchapin: UI
//Description: This is the page for viewing a project.
"use client";

import { useEffect, useState } from "react";
import { Tag, Image, Carousel, Spin } from "antd";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../../../../amplify/data/resource";
import { getUrl } from "aws-amplify/storage";
import { Amplify } from "aws-amplify";
import config from "@/../amplify_outputs.json";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

Amplify.configure(config, { ssr: true });
const client = generateClient<Schema>();
type Project = Schema["Projects"]["type"];

export default function Page({ params }: { params: { project: string } }) {
  const [post, setPost] = useState<Project>({} as Project);
  const [projectImageUrls, setProjectImageUrls] = useState<string[]>([]);
  const [resolvedStudents, setResolvedStudents] = useState<{ id: string; name: string }[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotAvailable, setIsNotAvailable] = useState(true);
  const [ismod, setisMod] = useState(false);



  useEffect(() => {
    const fetchData = async () => {
      if (isLoading) {
        let authuser = true;
        const slug = params.project;
        try{
        await getCurrentUser();
        }
        catch{
          authuser = false;
        }
        if (authuser) {
          const postResponse = await client.models.Projects.get({ id: slug }, { authMode: "userPool" });
          if (!postResponse || !postResponse.data) {
            return <div>Post not found</div>;
          } else {
            setPost(postResponse.data as Project);
          }
        }
        else{
          const postResponse = await client.models.Projects.get({ id: slug }, { authMode: "identityPool" });
          if (!postResponse || !postResponse.data) {
            return <div>Post not found</div>;
          } else {
            setPost(postResponse.data as Project);
          }
        }


        const projectImages = [
          ...(post.ProjectCoverImagePath
            ? [await getUrl({ path: post.ProjectCoverImagePath })]
            : []),
          ...(post.projectOtherImagePath
            ? await Promise.all(
              post.projectOtherImagePath
                .filter((path): path is string => !!path)
                .map((path) => getUrl({ path }))
            )
            : []),
        ];
        setProjectImageUrls(projectImages.map((image) => image.url.toString()));

        if (authuser) {
        const { data: studentsPro } = await client.models.ProjectsStudents.list({
          filter: { projectId: { eq: slug } }, authMode: "userPool"
        });
        const studentIds = studentsPro.map((student) => student.studentId);
        const studentPromises = studentIds.map(async (studentId) => {
          const { data: student } = await client.models.Student.get({ id: studentId }, { authMode: "userPool" });
          return {
            id: student?.id || "Unknown ID",
            name: student?.fristName + " " + student?.lastName || "Unnamed Student",
          };
        });
        setResolvedStudents(await Promise.all(studentPromises));
      }
      else {
        const { data: studentsPro } = await client.models.ProjectsStudents.list({
          filter: { projectId: { eq: slug } }, authMode: "identityPool"
        });
        const studentIds = studentsPro.map((student) => student.studentId);
        const studentPromises = studentIds.map(async (studentId) => {
          const { data: student } = await client.models.Student.get({ id: studentId }, { authMode: "identityPool" });
          return {
            id: student?.id || "Unknown ID",
            name: student?.fristName + " " + student?.lastName || "Unnamed Student",
          };
        });
        setResolvedStudents(await Promise.all(studentPromises));
      }

        try {
          const user = await getCurrentUser();
          if (user) {
            setIsOwner(
              Array.isArray(post.projectOwners) &&
              post.projectOwners.includes(user.userId)
            );
            const { tokens } = await fetchAuthSession();
            const groups = tokens?.accessToken.payload["cognito:groups"] || [];
            if (groups == ("ADMINS") || groups == ("Moderator")) {
              setisMod(true);
            }
            else {
              setisMod(false);
            }
          }
        }
        catch {
          setIsOwner(false);
          setisMod(false);
        }



        if (post.projectStatus !== "Approved") {
          setIsNotAvailable(true);
        }
        else {
          setIsNotAvailable(false);
        }
        setIsLoading(false);

      }
    };

    fetchData();
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
  }
  if (isNotAvailable && !isLoading && !ismod && !isOwner) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl font-bold text-red-500">This project is not available.</p>
      </div>
    );
  }
  if (!post) return <div>Post not found</div>;

  return (
    <div>
      <div className="relative bg-[#001641] w-full h-[550px] overflow-hidden">
        <div className="flex items-start justify-between h-full">
          {/* Left: Title Section */}
          <div className="flex flex-col justify-center items-start text-white h-full px-6 w-[calc(100%-1000px)]">
            <div>
              <div>
                {post.projectTags &&
                  post.projectTags.map((tag) => <Tag key={tag} className="capitalize">{tag}</Tag>)}
              </div>

              <div>
                <h1 className="text-white text-8xl font-bold mt-4 mb-4">
                  {post.projectTitle}
                </h1>
              </div>
              
              <div>
                <p className="italic mt-2 text-white">
                  Published Year: {post.projectYear}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="mt-16 -mb-16 bg-[#ED0A00]  text-white text-xl font-semibold py-4 px-6 flex items-center flex-wrap gap-2" style={{ width: "fit-content" }}>
                <span>Interested in this project?</span> 
                <a
                  href={`/connectstudent?project=${encodeURIComponent(
                    post.id as string
                  )}`}
                  className="underline text-white hover:text-[#0033FF] italic"
                >
                  Click here
                </a>
                <span>and fill up the form</span>
              </div>
            </div>
          </div>

          {/* Right: Carousel */}
          <div style={{ width: "1000px", height: "550px" }}>
            <Carousel arrows infinite={true} autoplay style={{ height: "100%" }}>
              {projectImageUrls.map((image, index) => (
                <div key={index}>
                  <Image
                    src={image.toString()}
                    alt={`Project Image ${index + 1}`}
                    style={{ width: "1000px", height: "550px", objectFit: "fill" }}
                  />
                </div>
              ))}
            </Carousel>
          </div>
        </div>
      </div>
      
      <div className="w-full flex justify-center">
        <div className="max-w-5xl w-full flex flex-col px-6">
          <section>
            {post.projectStatus != "Approved" && (
              <div className="bg-[#ED0A00] text-white p-4 rounded-none mt-4 mb-4">
                <h2 className="text-xl font-bold">Project Status</h2>
                <p>{post.projectStatus}</p>
                {post.projectStatus === "Rejected" && (
                  <p>
                    Reason: {post.projedctRejectReason || "No reason provided"}
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-5">
              <a
                onClick={() => window.history.back()}
                className="text-[#0033FF] font-semibold no-underline text-lg hover:text-[#ED0A00] gap-4 flex cursor-pointer"
              >
                <span className="text-2xl leading-none font-semibold">‹</span>Back
              </a>
              <div className="flex space-x-2">
                {isOwner && !ismod && (
                  <a
                    href={`/editproject?projectId=${post.id}`}
                    className="text-[#0033FF] font-semibold text-lg hover:text-[#ED0A00] flex cursor-pointer"
                  >
                    Edit your project
                  </a>
                )}
                {ismod && (
                  <a
                    href={`/adminProjectForm?projectId=${post.id}`}
                    className="text-[#0033FF] font-semibold text-lg hover:text-[#ED0A00] flex cursor-pointer"
                  >
                    Edit project
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Project Background */}
          {post.projectBackground && (
            <section className="mborder-b mb-4">
            <h1 className="text-[#ED0A00] text-3xl font-bold">Background of the Project</h1>
            <div 
              className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
              dangerouslySetInnerHTML={{ __html: post.projectBackground }}
            />
              
          </section>
          )}

          {/* Project Tech Description */}
          {post.projectTechnology && (
            <section className="border-b mb-4">
              <h1 className="text-[#ED0A00] text-3xl font-bold">
                Technology Description
              </h1>
              <div 
                className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                dangerouslySetInnerHTML={{ __html: post.projectTechnology }}
              />
            </section>
          )}

          {post.projectBenefits && (
            <section className="mb-4">
            <h1 className="text-[#ED0A00] text-3xl font-bold">Project Benefits</h1>
            <div 
              className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
              dangerouslySetInnerHTML={{ __html: post.projectBenefits }}
            />
          </section>
          )}

          {post.projectApplication && (
            <section className="mb-4">
              <h1 className="text-[#ED0A00] text-3xl font-bold">Project Applications</h1>
              <div 
                className="text-[#001641] text-lg leading-relaxed mt-2 text-justify space-y-4"
                dangerouslySetInnerHTML={{ __html: post.projectApplication }}
              />
            </section>
          )}
          
          <section className="border-b mb-4">
            <h1 className="text-[#ED0A00] text-3xl font-bold">
              Project Collaborators
            </h1>
            <ul className="list-disc pl-4 text-lg mt-2 text-[#001641]">
              {resolvedStudents.map((student, index) => (
                <li key={index} className="mt-2">
                  {student.name}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}