//Author:
//Jonty Hourn: Functionality and basic UI
// Ian Cuchapin, Dilan Wigemanne: UI Changes
//
"use client";

import React, { useState } from "react";
import { Form, Upload, Button, Card, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../../../amplify/data/resource";
import Papa from 'papaparse';

const client = generateClient<Schema>();

export const UploadCSVPage: React.FC = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!csvFile) {
            message.error("Please upload a CSV file before submitting.");
            return;
        }

        setLoading(true);

        const reader = new FileReader();
        reader.readAsText(csvFile);

        reader.onload = async (event) => {
            try {
                const csvData = event.target?.result as string;
                const parsedData = Papa.parse<{
                    "Project Title"?: string;
                    "Background of Project"?: string;
                    "Technology Description"?: string;
                    "Project Benefits"?: string;
                    "Project Tags"?: string;
                    "Year Completed"?: string;
                    "Students Involved"?: string;
                }>(csvData, { header: true, skipEmptyLines: true }).data;

                for (const row of parsedData) {
                    if (!row["Project Title"]) continue; // Skip rows without a title

                    const project = {
                        projectTitle: row["Project Title"],
                        projectBackground: row["Background of Project"],
                        projectTechnology: row["Technology Description"],
                        projectBenefits: row["Project Benefits"],
                        projectTags: row["Project Tags"]?.split(",").map((tag: string) => tag.trim()) || [],
                        projectYear: row["Year Completed"],
                        projectStatus: "Pending" as const,
                    };

                    const { data: createdProject } = await client.models.Projects.create(project, {
                        authMode: "userPool",
                    });

                    const students: string[] = row["Students Involved"]?.replace(/\n/g, ", ").split(",").map((s: string) => s.trim()) || [];
                    for (const studentName of students) {
                        const firstName = studentName.split(" ")[0];
                        const lastName = studentName.split(" ")[1] || "";

                        const { data: createdStudent } = await client.models.Student.create(
                            { fristName: firstName, lastName: lastName,  email: `${studentName.replace(/\s+/g, "").toLowerCase()}@example.com` , profileOwner: null},
                        
                            { authMode: "userPool" }
                        );

                        await client.models.ProjectsStudents.create(
                            {
                                projectId: createdProject?.id ?? "",
                                studentId: createdStudent?.id ?? "",
                            },
                            { authMode: "userPool" }
                        );
                    }
                }

                message.success("Projects added successfully!");
                setCsvFile(null);
            } catch (error) {
                console.error("Error processing CSV:", error);
                message.error("Failed to process the CSV file. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        reader.onerror = () => {
            message.error("Error reading the file. Please try again.");
            setLoading(false);
        };
    };

    return (
        <div className="flex justify-center items-center h-full p-10 mt-20">
            <Card className="w-full max-w-4xl p-10" style={{ borderRadius: 0 }}>
                <h1 className="text-4xl font-bold text-[#001641] mb-8 text-center">
                    Bulk Upload of Projects
                </h1>
                <div className="mb-5">
                    <h2 className="text-lg font-bold block mb-2 text-[#0033FF]">Required Headings for CSV</h2>
                    <p className="font-semibold">
                        Project Title, Project Background, Technology Description, Project Benefits,
                        Project Application (Optional), Project Collaborators (Optional), Project Tags,
                        Year of Completion
                    </p>
                </div>

                <Form layout="vertical" className="space-y-8">
                    {/* File Upload */}
                    <Form.Item
                        label={
                            <span className="text-lg font-bold block mb-2 text-[#0033FF]">
                                Upload CSV File
                            </span>
                        }
                    >
                        <Upload
                            beforeUpload={() => false}
                            maxCount={1}
                            accept=".csv"
                            onChange={(info) => {
                                const file = info.fileList[0]?.originFileObj || null;
                                setCsvFile(file);
                            }}
                        >
                            <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 0 }}>
                                Click to Upload
                            </Button>
                        </Upload>
                    </Form.Item>

                    {/* Submit Button */}
                    <Form.Item>
                        <Button
                            type="primary"
                            onClick={handleUpload}
                            loading={loading}
                            className="w-full py-3 hover:opacity-70"
                            style={{ borderRadius: 0, backgroundColor: "#0033FF", fontWeight: "bold" }}
                        >
                            {loading ? "Uploading..." : "Submit CSV"}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
