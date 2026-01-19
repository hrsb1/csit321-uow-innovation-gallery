// Author:
//Jonty Hourn: page Functiaonality and UI
//Ian Cuchapin, Dilan Wijemanne: UI Changes
//Description: ResonTable component for managing Contact Resons in the admin panel
"use client"
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import React, { useEffect, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';

import { Button, Form, Modal, Upload } from 'antd';
const client = generateClient<Schema>();


export const ResonTable: React.FC = () => {

    const [data, setData] = useState<{ ResonName: string; ResonId: string }[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [formEdit] = Form.useForm();
    const [currenTageId, setTagId] = useState<string>("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [hasMorePages, setHasMorePages] = useState(true);

    const feachTag = React.useCallback(async(token: string| null) => {
        const { data: tags, nextToken: newNextToken, errors } = await client.models.ContactReasons.list({nextToken: token, limit: 12});
        if (!errors) {
            setData(tags.map(Tags => ({
                ResonId: Tags.id,
                ResonName: Tags.reasonName,
            })));
            setNextToken(newNextToken ?? null);
            if (!newNextToken) setHasMorePages(false);
        }
        
    } , []);

    useEffect(() => {
        feachTag(pageTokens[currentPageIndex]);
    }, [currentPageIndex, feachTag, pageTokens]);


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
            <div className='flex justify-end items-center mb-4 gap-4 pr-[25px] pt-4'>
                <Button className ="custom-btn"
                onClick={() => setIsAddModalOpen(true)} >Add Reason</Button>
                <Button className ="custom-btn"
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
                            <th className="w-[60%] border border-gray-600 px-4 py-2 text-center">Reason Name</th>
                            <th className="w-[40%] border border-gray-600 px-4 py-2 text-center">Edit Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((tags, index) => (
                            <tr key={index} className={`text-center ${index % 2 === 0 ? 'bg-gray-300' : 'bg-gray-100'}`}>
                                <td className="w-[60%] border border-gray-600 px-4 py-2">{tags.ResonName}</td>
                                <td className="w-[40%] border border-gray-600 px-4 py-2">
                                    <Button onClick={() => {
                                        formEdit.setFieldsValue({ tagName: tags.ResonName});
                                        setIsEditModalOpen(true);
                                        setTagId(tags.ResonId);
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
                title="Add Reasons"
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
                        const { tagName} = values;
                        try {
                            if (data.some(tags => tags.ResonName === tagName)) {
                                alert("Reason already exists");
                                return;
                            }
                            await client.models.ContactReasons.create({
                                reasonName: tagName
                            }, { authMode: "userPool" });
                            feachTag(pageTokens[currentPageIndex]);
                            form.resetFields();
                            setIsAddModalOpen(false);
                        } catch (error) {
                            console.error("Error adding Reason:", error);
                        }
                    }}
                >
                    <Form.Item
                        label="Reason Name"
                        name="tagName"
                        rules={[{ required: true, message: 'Please input the Reason name!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Bulk Upload"
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
                                        const datacsv = results.data as { tagName: string}[];
                                        for (const row of datacsv) {
                                            if (!data.some(tags => tags.ResonName === row.tagName)) {
                                                try {
                                                    await client.models.ContactReasons.create({
                                                        reasonName: row.tagName.toLocaleLowerCase(),
                                                    }, { authMode: "userPool" });
                                                } catch (error) {
                                                    console.error("Error adding degree:", error);
                                                }
                                            }

                                        }
                                        feachTag(pageTokens[currentPageIndex]);
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
                <p>Upload CSV file here</p>
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
                title="Edit Reason"
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
                        const { tagName } = values;
                        try {
                            await client.models.ContactReasons.update({
                                id: currenTageId,
                                reasonName: tagName,
                            }, { authMode: "userPool" });
                            
                            formEdit.resetFields();
                            feachTag(pageTokens[currentPageIndex]);
                        } catch (error) {
                            console.error("Error updating Reason:", error);
                        }
                    }}
                >
                    <Form.Item
                        label="Reason Name"
                        name="tagName"
                        rules={[{ required: true, message: 'Please input the Reason name!' }]}
                    >
                        <input type="text" className="border border-gray-300 rounded-md p-2 w-full" />
                    </Form.Item>
                    
                </Form>
                <Button
                    onClick={async () => {
                        try {
                            await client.models.ContactReasons.delete({
                                id: currenTageId,
                            }, { authMode: "userPool" });
                            feachTag(pageTokens[currentPageIndex]);
                            formEdit.resetFields();
                            setIsEditModalOpen(false);
                        } catch (error) {
                            console.error("Error deleting Tag:", error);
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
