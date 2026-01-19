//Author:
//Ian Cuchapin: UI
//Jonty Hourn: Intergration with AWS Amplify
//Description: page for displaying student information and their projects for Admin
'use client'
import { Button, Card, Image } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { Amplify } from "aws-amplify";
import config from '@/../amplify_outputs.json';
import { generateClient } from 'aws-amplify/data';
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";


import { type Schema } from '../../../../amplify/data/resource';
import { getUrl } from "aws-amplify/storage";

const client = generateClient<Schema>();
type Project = Schema['Projects']["type"];

Amplify.configure(config, { ssr: true });

export default function AccountPage() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get("studentId") || "";
    const [galleryItems, setGalleryItems] = useState<Project[]>([]);
    const router = useRouter();
    const Initialize = useRef(false);
    const { Meta } = Card;




    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        degree: '',
        profileOwner: '' as string | null,
    })


    useEffect(() => {
        async function fetchStudentData() {
            if (!Initialize.current) {
            Initialize.current = true;
              
            
            const data = await client.models.Student.get({
                id: studentId
            }, { authMode: "userPool" });
            if (!data) {
                console.error("Student data not found");
                return;
            }
            const fullName = data.data?.fristName + " " + data.data?.lastName;
            setFormData({
                id: data.data?.id ?? "Unknown",
                name: fullName ?? "Unknown",
                email: data.data?.email ?? "Unknown",
                profileOwner: data.data?.profileOwner ?? 'Auto Generated Account',
                phone: data.data?.phone ?? "Unknown",
                degree: data.data?.degree ?? "Unknown",
            });

            const galleryData = await client.models.ProjectsStudents.list(
                {
                    filter: {
                        studentId: {
                            eq: studentId
                        }
                    }
            , authMode: "userPool"}
              );

            if (galleryData) {
                for (const item of galleryData.data) {

                    if (!galleryItems.some((i) => i.id === item.projectId)) {
                        const projectData = await client.models.Projects.get({
                            id: item.projectId
                        }, { authMode: "userPool" });
                        if (projectData) {
                            if (projectData.data?.ProjectCoverImagePath) {
                                const imageUrl = await getUrl({ path: projectData.data.ProjectCoverImagePath });
                                projectData.data.ProjectCoverImagePath = imageUrl.url.toString(); 
                            }
                            setGalleryItems((prev) => [...prev, projectData.data as Project]);
                        }

                    }
                }
            }
        }

            
        }
        fetchStudentData();
    },);

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="flex flex-col py-10 px-12 w-3/4 max-w-xl bg-gray-100 mb-10 mt-10">
                <div className="flex flex-row justify-between">
                    <div className="flex flex-row gap-2">
                        <Button type="primary" onClick={() => window.history.back()}
                            style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                        >
                            Back
                        </Button>
                    </div>
                </div>
                <div className="font-bold text-2xl text-[#001641]">
                    <p>Student&apos;s Personal Info</p>
                </div>

                <div className="w-full h-px bg-gray-300" />

                <div>
                    <p className="text-[#ED0A00] font-semibold text-xl">Name</p>
                    <p className="text-lg">{formData.name}</p>
                </div>
                <div>
                    <p className="text-[#ED0A00] font-semibold text-xl">Email</p>
                    <p className="text-lg">{formData.email}</p>
                </div>
                <div>
                    <p className="text-[#ED0A00] font-semibold text-xl">Phone</p>
                    <p className="text-lg">{formData.phone}</p>
                </div>
                <div>
                    <p className="text-[#ED0A00] font-semibold text-xl">Degree</p>
                    <p className="text-lg">{formData.degree}</p>
                </div>
                
                <div className="mb-10">
                    <div className="w-full h-px bg-gray-300 mb-5" />
                    <p className="font-bold text-2xl text-[#001641] mb-4">Student&apos;s Projects</p>

                    {galleryItems.length > 0 ? (
                    <div className="flex flex-col gap-6">
                        {galleryItems.map((item) => (
                        <Card
                            key={item.id}
                            cover={
                            <Image
                                alt={item.projectTitle || ""}
                                src={item.ProjectCoverImagePath || ""}
                                preview={false}
                                style={{ height: "6rem", objectFit: "cover" }}
                            />
                            }
                            className="rounded-lg shadow-md overflow-hidden hover:cursor-pointer hover:bg-blue-100"
                            onClick={() => router.push(`/gallery/${item.id}`)}
                        >
                            <Meta
                            title={
                                <span className="text-[#ED0A00] whitespace-normal break-words">
                                {item.projectTitle}
                                </span>
                            }
                            />
                        </Card>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center text-gray-500 py-10">No projects found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
