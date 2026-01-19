//Author:
//Ian Cuchapin: UI
//Jonty Hourn: Intergration with AWS Amplify
//Description: Page for displaying client requests in the admin section
"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { generateClient } from "aws-amplify/data";
import { useRouter } from "next/navigation";

import { useSearchParams } from "next/navigation";
import { type Schema } from "../../../../amplify/data/resource";

const { Title, Text, Paragraph } = Typography;

const client = generateClient<Schema>();
type ClientRequestData = Schema["InvestorInterest"]["type"];


interface ProjectData {
    projectTitle: string;

}
interface Student {
    id: string;
    name: string;
}


const ClientRequestForm: React.FC = () => {
    const searchParams = useSearchParams();
    const investid = searchParams.get("investid");
    const [data, setData] = useState<ClientRequestData>();
    const [projectData, setProjectData] = useState<ProjectData>();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

    useEffect(() => {
        const featchData = async () => {
            if (investid) {
                const response = await client.models.InvestorInterest.get({ id: investid }, { authMode: "userPool" });
                if (response) {
                    setData(response.data as ClientRequestData);

                    const projectID = response.data?.projectId;
                    if (projectID) {
                        const projectResponse = await client.models.Projects.get({ id: projectID });
                        if (projectResponse) {
                            setProjectData({
                                projectTitle: projectResponse.data?.projectTitle || "",
                            });
                        }

                    }
                } else {
                    console.error("investid is null");
                }
            }

        }
        featchData();
    }
        , [investid]);

    if (!data) {
        return <div>Loading...</div>;
    }
    const handleBackButtonClicked = () => {
        window.history.back();
    }


    const openStudentModal = async (projectId: string) => {
        try {
            const { data: studentsPro } = await client.models.ProjectsStudents.list({ filter: { projectId: { eq: projectId } },  authMode: "userPool" });
            const studentIds = studentsPro.map((student) => student.studentId);
            const studentPromises = studentIds.map(async (studentId) => {
                const { data: student } = await client.models.Student.get({ id: studentId }, { authMode: "userPool" });
                return {
                    id: student?.id || "Unknown ID",
                    name: student?.fristName + " " + student?.lastName || "Unnamed Student",
                };
            });
            const resolvedStudents = await Promise.all(studentPromises);
            setStudents(resolvedStudents);
            setIsStudentModalOpen(true);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const closeStudentModal = () => {
        setIsStudentModalOpen(false);
        setStudents([]);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBackButtonClicked}
                    className="mb-6"
                    style={{ border: "none", borderRadius: 0, color: "white", fontWeight: "bold", backgroundColor: "#0033FF" }}
                >
                    Back
                </Button>

                <Card style={{ borderRadius: 0 }}>
                    <Title level={2} style={{ color: '#0033FF' }} className="text-center mb-6">
                        Business Enquiry Form
                    </Title>

                    {/* Project Name Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Project Name
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {projectData?.projectTitle}
                        </Paragraph>
                        <Button onClick={() => router.push('/gallery/' + data.projectId)} 
                            style={{ fontWeight: "bold", borderRadius: 0, color: "white", backgroundColor: "#001641", border: "none" }}
                        >
                            View Project
                        </Button>
                        <Button onClick={() => openStudentModal(data.projectId)} className="ml-4"
                            style={{ fontWeight: "bold", borderRadius: 0, color: "white", backgroundColor: "#001641", border: "none" }}
                        >
                            View Students
                        </Button>
                    </div>

                    {/* Full Name Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Full Name
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.investorName}
                        </Paragraph>
                    </div>

                    {/* Business Name Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Business or Company Name
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.investorCompany}
                        </Paragraph>
                    </div>

                    {/* Business Email Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Business or Company Email
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.investorEmail}
                        </Paragraph>
                    </div>

                    {/* Phone Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Phone
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.investorPhone}
                        </Paragraph>
                    </div>

                    {/* Reasons Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Reasons for Connecting
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.investorReson}
                        </Paragraph>
                    </div>

                    {/* Message Field */}
                    <div className="mb-6">
                        <Text style={{ color: '#001641', fontSize: '1.3rem', fontWeight: "bold" }} className="block mb-1">
                            Brief Message for the Students
                        </Text>
                        <Paragraph className="text-base text-gray-900 bg-gray-100 px-4 py-2 mt-2">
                            {data.message}
                        </Paragraph>
                    </div>

                    {/* Action Buttons */}
                   
                </Card>
                {isStudentModalOpen && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-30" onClick={closeStudentModal}>
                    <div className="bg-white p-6 w-80 z-40" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl text-[#001641] mb-4">Students</h2>
                        {students.length > 0 ? (
                            <ul>
                                {students.map((student, idx) => (
                                    <li key={idx} className="mb-2 text-lg text-[#001641]">
                                        {student.name || "Unnamed Student"}
                                        <button
                                            className="ml-2 bg-[#0033FF] text-sm text-white border-none font-bold"
                                            onClick={() => router.push('/adminStudentForm?studentId=' + student.id)}
                                        >
                                            View Details
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No students found.</p>
                        )}
                        <button
                            onClick={closeStudentModal}
                            className="block w-full py-2 px-4 text-center bg-[#ED0A00] text-white font-bold mt-4 border-none cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ClientRequestForm;