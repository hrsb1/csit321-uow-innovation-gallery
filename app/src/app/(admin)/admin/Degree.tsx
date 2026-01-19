// Author:
//Jonty Hourn: page Functiaonality and UI
//Ian Cuchapin, Dilan Wijemanne: UI Changes
//Description: DegreeTable component for managing Degrees in the admin panel
"use client"
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import React, { useEffect, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';

import { Button, Form, Modal, Upload } from 'antd';
const client = generateClient<Schema>();


export const DegreeTable: React.FC = () => {

    const [data, setData] = useState<{ degreeName: string; degreeId: string; degreeItemID: string }[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [formEdit] = Form.useForm();
    const [currenDegreeId, setDegreeId] = useState<string>("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [hasMorePages, setHasMorePages] = useState(true);

    const fetchDegrees =  React.useCallback(async(token: string| null) => {
        const { data: degrees, nextToken: newNextToken, errors } = await client.models.Degree.list({ authMode: "userPool", nextToken: token, limit: 12 });
        if (!errors) {
            setData(degrees.map(degree => ({
                degreeItemID: degree.id,
                degreeName: degree.degreeName,
                degreeId: degree.degreeid,
            })));
            setNextToken(newNextToken ?? null);
            if (!newNextToken) setHasMorePages(false);
        }
        else {
            console.error("Error fetching degrees:", errors);
        }
    }, []);

    useEffect(() => {
        fetchDegrees(pageTokens[currentPageIndex]);
    }, [pageTokens, currentPageIndex, fetchDegrees]);
    const handleNextPage = () => {
        if (hasMorePages && currentPageIndex === pageTokens.length - 1) {
            setPageTokens([...pageTokens, nextToken]);
        }
        if (hasMorePages) {
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
            setHasMorePages(true);
        }
    };

    return (
        <div className="flex flex-col">
            <div className='flex justify-end items-center gap-4 pr-[25px] pt-4'>
                <Button className = "custom-btn"
                    onClick={() => setIsAddModalOpen(true)} >Add Degree</Button>
                <Button className = "custom-btn"
                    onClick={() => setIsBulkUploadModalOpen(true)} >Bulk Upload</Button>
                <style>{`
                    .custom-btn {
                    color: white !important;
                    background-color: #0033FF !important;
                    border-radius: 0 !important;
                    border-width: 0 !important;
                    font-weight: bold;
                    }

                    .custom-btn:hover {
                    background-color: #ED0A00 !important;
                    color:white !important;
                    }
                `}</style>
            </div>
            <div className="p-6">
                <table className="min-w-full border-collapse border border-gray-600">
                    <thead>
                        <tr className="bg-gray-500 text-white">
                            <th className="w-[60%] border border-gray-600 px-4 py-2 text-center">Degree Name</th>
                            <th className="w-[20%] border border-gray-600 px-4 py-2 text-center">Degree ID</th>
                            <th className="w-[20%] border border-gray-600 px-4 py-2 text-center">Edit Degree</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((degree, index) => (
                            <tr key={index} className={`text-center ${index % 2 === 0 ? 'bg-gray-300' : 'bg-gray-100'}`}>
                                <td className="w-[60%] border border-gray-600 px-4 py-2">{degree.degreeName}</td>
                                <td className="w-[20%] border border-gray-600 px-4 py-2">{degree.degreeId}</td>
                                <td className="w-[20%] border border-gray-600 px-4 py-2">
                                    <Button onClick={() => {
                                        formEdit.setFieldsValue({ degreeName: degree.degreeName, degreeId: degree.degreeId });
                                        setIsEditModalOpen(true);
                                        setDegreeId(degree.degreeItemID);
                                    }} style={{ fontWeight: "bold", borderRadius: 0, border: "none", backgroundColor: "#0033FF", color: "white" }} className="hover:opacity-70"
                                    >
                                        Edit
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-center mt-4 gap-4">
                    <button
                        className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                        onClick={handlePreviousPage}
                        disabled={currentPageIndex === 0}
                    >
                        Previous
                    </button>
                    <button
                        className="w-32 bg-[#0033FF] hover:enabled:bg-[#ED0A00] font-bold text-white border-none px-5 py-3 gap-4 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                        onClick={handleNextPage}
                        disabled={!hasMorePages}
                    >
                        Next
                    </button>
                </div>
            </div>
            <Modal
                title="Add Degree"
                open={isAddModalOpen}
                okText="Add"
                onOk={form.submit}
                onCancel={() => {
                    setIsAddModalOpen(false);
                    form.resetFields();
                }}>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ degreeName: '', degreeId: '' }}
                    onFinish={async (values) => {
                        const { degreeName, degreeId } = values;
                        try {
                            if (data.some(degree => degree.degreeName === degreeName)) {
                                alert("Degree already exists");
                                return;
                            }
                            const degree = await client.models.Degree.create({
                                degreeName,
                                degreeid: degreeId,
                            }, { authMode: "userPool" });
                            setData([...data, { degreeName, degreeId, degreeItemID: degree.data?.id ?? "" }]);
                            form.resetFields();
                            setIsAddModalOpen(false);
                        } catch (error) {
                            console.error("Error adding degree:", error);
                        }
                    }}
                >
                    <Form.Item
                        label="Degree Name"
                        name="degreeName"
                        rules={[{ required: true, message: 'Please input the degree name!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>
                    <Form.Item
                        label="Degree ID"
                        name="degreeId"
                        rules={[{ required: true, message: 'Please input the degree ID!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>

                </Form>
            </Modal>

            <Modal
                title={<span className="text-3xl font-bold text-[#001641] mb-8 text-center">Bulk Upload</span>}
                open={isBulkUploadModalOpen}
                onOk={() => {
                    setIsBulkUploadModalOpen(false);
                    if (csvFile) {
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const text = e.target?.result;
                            if (typeof text === 'string') {
                                Papa.parse(text, {
                                    header: true,
                                    complete: async (results) => {
                                        const datacsv = results.data as { degreeName: string; degreeId: string }[];
                                        for (const row of datacsv) {
                                            if (!data.some(degree => degree.degreeName === row.degreeName)) {
                                                try {
                                                    await client.models.Degree.create({
                                                        degreeName: row.degreeName.toLowerCase(),
                                                        degreeid: row.degreeId,
                                                    }, { authMode: "userPool" });
                                                } catch (error) {
                                                    console.error("Error adding degree:", error);
                                                }
                                            }

                                        }
                                        fetchDegrees(pageTokens[currentPageIndex]);
                                        setCsvFile(null);
                                        setIsBulkUploadModalOpen(false);
                                    },
                                });
                            }
                        };
                        reader.readAsText(csvFile);
                    }
                }}
                okText="Upload"
                onCancel={() => setIsBulkUploadModalOpen(false)}
            >
                <p className='text-lg font-bold block mb-2 text-[#0033FF]'>Required Headings for Degree Bulk Upload</p>
                <p className='font-semibold'>Degree Name, Degree ID</p>
                <p className='text-lg font-bold block mb-2 text-[#0033FF]'>Upload CSV file here</p>
                <Upload
                    maxCount={1}
                    accept=".csv"
                    onChange={(info) => {
                        const file = info.fileList[0]?.originFileObj || null;
                        if (file) {
                            setCsvFile(file);
                        }
                    }}
                >
                    <Button icon={<UploadOutlined />}>Click to Upload</Button>

                </Upload>

            </Modal>
            <Modal
                title="Edit Degree"
                open={isEditModalOpen}
                onOk={() => {
                    formEdit.submit();
                    setIsEditModalOpen(false);
                }
                }
                okText="Save"

                onCancel={() => setIsEditModalOpen(false)}
            >
                <Form
                    form={formEdit}
                    layout="vertical"
                    initialValues={{ degreeName: '', degreeId: '' }}
                    onFinish={async (values) => {
                        const { degreeName, degreeId } = values;
                        try {
                            await client.models.Degree.update({
                                id: currenDegreeId,
                                degreeName,
                                degreeid: degreeId,
                            }, { authMode: "userPool" });
                            setData(data.map(degree => {
                                if (degree.degreeItemID === currenDegreeId) {
                                    return { ...degree, degreeName, degreeId };
                                }
                                return degree;
                            }));
                            formEdit.resetFields();
                        } catch (error) {
                            console.error("Error updating degree:", error);
                        }
                    }}
                >
                    <Form.Item
                        label="Degree Name"
                        name="degreeName"
                        rules={[{ required: true, message: 'Please input the degree name!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>
                    <Form.Item
                        label="Degree ID"
                        name="degreeId"
                        rules={[{ required: true, message: 'Please input the degree ID!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>
                </Form>
                <Button
                    onClick={async () => {
                        try {
                            await client.models.Degree.delete({
                                id: currenDegreeId,
                            }, { authMode: "userPool" });
                            setData(data.filter(degree => degree.degreeItemID !== currenDegreeId));
                            formEdit.resetFields();
                            setIsEditModalOpen(false);
                        } catch (error) {
                            console.error("Error deleting degree:", error);
                        }
                    }
                    }
                >

                    <span className="text-red-500">Delete</span>
                </Button>
            </Modal>
        </div>
    )
}
