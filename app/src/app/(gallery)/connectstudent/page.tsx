//Author: 
//Jonty Hourn: AWS Amplift Integration
//Ian caphapin : Created Form and UI
//Description: This is the Connect Student page for the application. It allows users to connect with a project by filling out a form with their details and the reason for connecting.
"use client"

import React, { useState, useEffect, Suspense } from "react";
import type { FormProps } from "antd";
import { Button, Form, Input, Select, FormInstance } from "antd";
import { AntPhone } from "@/app/components/AntPhone";
import { message } from "antd";
import { useSearchParams } from "next/navigation";
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import { getCurrentUser } from "aws-amplify/auth";
const client = generateClient<Schema>();


type FieldType = {
    projectName?: string;
    fullName?: string;
    businessName?: string;
    businessEmail?: string;
    phone?: string;
    reason?: string;
    message?: string;
};

const ConnectStudent: React.FC = () => {
    const [antdPhone, setAntdPhone] = useState("+380");
    const [form] = Form.useForm();

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InnerConnectStudent form={form} antdPhone={antdPhone} setAntdPhone={setAntdPhone} />
        </Suspense>
    );
};

const InnerConnectStudent: React.FC<{
    form: FormInstance<FieldType>;
    antdPhone: string;
    setAntdPhone: React.Dispatch<React.SetStateAction<string>>;
}> = ({ form, antdPhone, setAntdPhone }) => {
    const searchParams = useSearchParams();
    const projectid = searchParams.get("project") || "";
    const [resons, setresons] = useState<string[]>();
    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                let authuser = true;
                try {
                    await getCurrentUser();
                }
                catch {
                    authuser = false;
                }
                if (authuser) {
                    client.models.Projects.get({ id: projectid }, { authMode: "userPool" })
                        .then((project) => {
                            if (project) {
                                form.setFieldsValue({
                                    projectName: project.data?.projectTitle ?? undefined,
                                });
                            }
                        });
                    const resonData = client.models.ContactReasons.list({authMode: "userPool" });
                    resonData.then((resons) => {
                        setresons(resons.data?.map((item) => item.reasonName) || []);
                    }).catch((error) => {
                        console.error("Error fetching reasons:", error);

                    });
                } else {
                    client.models.Projects.get({ id: projectid }, { authMode: "identityPool" })
                        .then((project) => {
                            if (project) {
                                form.setFieldsValue({
                                    projectName: project.data?.projectTitle ?? undefined,
                                });
                            }
                        });
                        const resonData = client.models.ContactReasons.list({authMode: "identityPool" });
                    resonData.then((resons) => {
                        setresons(resons.data?.map((item) => item.reasonName) || []);
                    }).catch((error) => {
                        console.error("Error fetching reasons:", error);

                    });
                }
            } catch (error) {
                console.error("Error fetching project data:", error);
            }
        };

        fetchProjectData();
    }, [projectid, form]);

    const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
        try {

            await client.models.InvestorInterest.create({
                projectId: projectid,
                investorName: values.fullName || "",
                investorEmail: values.businessEmail || "",
                investorPhone: values.phone || "",
                investorCompany: values.businessName || "",
                investorReson: values.reason || "",
                message: values.message || "",
                status: "New",
                statusCatagory: "New",
            }, { authMode: "identityPool" });
            message.success("Form has successfully submitted! Admin will take a look at it soon", 5);
        }
        catch (error) {
            console.error("Error creating investor request:", error);
            message.error("An error occurred while submitting the form. Please try again later.", 5);
        }

        form.resetFields();
        window.history.back();
    };

    const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (errorInfo) => {
        console.log("Failed:", errorInfo);
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-10">
            <div className="w-full max-w-4xl shadow-lg p-10 bg-white rounded-lg">
                <h1 className="text-4xl text-blue-700 font-bold mb-6 text-center text-[#001641]">Business Enquiry Form</h1>
                <Form
                    form={form}
                    name="basic"
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    autoComplete="off"
                    className="w-full"
                    layout="vertical"
                >
                    {/* Project Name */}
                    <Form.Item<FieldType >
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Project Name</span>}
                        name="projectName"
                        style={{ marginBottom: 10 }}
                    >
                        <Input size="large" disabled readOnly className="pointer-events-none bg-gray-100 border-gray-300 focus:ring-0 focus:border-gray-300 italic" style={{ borderRadius: 0, color: "black" }} />
                    </Form.Item>

                    {/* Full Name */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Full Name</span>}
                        name="fullName"
                        rules={[{ required: true, message: "Please input your full name!" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <Input size="large" placeholder="Enter your full name" style={{ borderRadius: 0 }} />
                    </Form.Item>

                    {/* Business Name */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Business or Company Name</span>}
                        name="businessName"
                        rules={[{ required: true, message: "Please input your business or company name!" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <Input size="large" placeholder="Enter your business or company name" style={{ borderRadius: 0 }} />
                    </Form.Item>

                    {/* Business Email */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Business or Company Email</span>}
                        name="businessEmail"
                        rules={[{ required: true, message: "Please input your business or company email!" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <Input size="large" placeholder="Enter your business or company email" style={{ borderRadius: 0 }} />
                    </Form.Item>

                    {/* Phone */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Phone</span>}
                        name="phone"
                        rules={[{ required: true, message: "Please input your phone!" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <AntPhone value={antdPhone} onChange={setAntdPhone} inputStyle={{ borderRadius: 0 }} />
                    </Form.Item>

                    {/* Reasons of Connecting */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Enquiry Reason</span>}
                        name="reason"
                        rules={[{ required: true, message: "Please select a reason!" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <Select size="large" placeholder="Select a reason">
                            {resons?.map((reason, index) => (
                                <Select.Option key={index} value={reason}>
                                    {reason}
                                </Select.Option>
                            ))}
                        </Select>

                    </Form.Item>

                    {/* Brief Message */}
                    <Form.Item<FieldType>
                        label={<span className="text-lg font-semibold block mb-2 text-[#001641]">Additional Message</span>}
                        name="message"
                    >
                        <Input.TextArea size="large" className="w-full" style={{ borderRadius: 0 }} rows={4} placeholder="Type here your message" />
                    </Form.Item>

                    {/* Submit Button */}
                    <Form.Item className="text-center">
                        <div className="flex justify-end gap-4">
                            {/* Cancel Button */}
                            <Button

                                style={{ backgroundColor: "#ED0A00", color: "white", borderRadius: 0, border: "none", fontWeight: "bold" }}
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </Button>

                            {/* Submit Button */}
                            <Button type="primary" htmlType="submit"
                                style={{ backgroundColor: "#0033FF", color: "white", borderRadius: 0, border: "none", fontWeight: "bold" }}
                            >
                                Submit
                            </Button>
                        </div>
                    </Form.Item>

                </Form>
            </div>
        </div>
    )

};

export default ConnectStudent;