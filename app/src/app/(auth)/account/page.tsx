//Author: 
//Jonty Hourn: Basic UI and integration with AWS Amplify
//Yoses Riandy, Dilan Wigemanne: UI Changes
//Description: page for displaying user account information and allowing users to update their details
'use client'
import { Button, Form, Input, Modal, Image, Select, Spin, SelectProps, Table, Card } from "antd";
import type { TableProps } from "antd";
import { AntPhone } from "@/app/components/AntPhone";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { signOut, updatePassword, fetchUserAttributes, updateUserAttribute, type UpdateUserAttributeOutput, confirmUserAttribute, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from "aws-amplify";
import { useRouter } from 'next/navigation';
import config from '@/../amplify_outputs.json';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from "aws-amplify/storage";
import debounce from "lodash/debounce";


import { type Schema } from '../../../../amplify/data/resource';
const client = generateClient<Schema>();
type Project = Schema['Projects']['type'];;

Amplify.configure(config, { ssr: true });

export interface DebounceSelectProps<ValueType extends { key?: string; label: React.ReactNode; value: string | number } = { key?: string; label: React.ReactNode; value: string | number }>
    extends Omit<SelectProps<ValueType | ValueType[]>, "options" | "children"> {
    fetchOptions: (search: string) => Promise<ValueType[]>;
    debounceTimeout?: number;
}

// Author: Jonty Hourn
// Description: This component is a debounced select input that fetches options based on user input.
// Attributes: https://ant.design/components/select

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

function toTitleCase(str: string): string {
  const lowerCaseWords = ['of', 'and', 'the', 'in', 'on', 'at', 'for', 'with', 'a', 'an', 'to'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index !== 0 && lowerCaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

async function featchDegreeList(search: string): Promise<{ label: string; value: string }[]> {
    if (!search) return [];

    const result = await client.models.Degree.list({
        authMode: "userPool",
        // Optional: you can remove filter here to get full list if size is small
    });

    const allDegrees = result.data;

    const lowerSearch = search.toLowerCase();

    // Score + filter
    const scored = allDegrees
        .filter((degree) => degree.degreeName.toLowerCase().includes(lowerSearch))
        .map((degree) => {
            const name = degree.degreeName.toLowerCase();
            let score = 0;

            if (name.startsWith(lowerSearch)) score += 2;
            if (name.includes(lowerSearch)) score += 1;

            return {
                label: degree.degreeName,
                value: degree.degreeid,
                score,
            };
        });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(({ label, value }) => ({
      label: toTitleCase(label),
      value,
    }));
}

export default function AccountPage() {
    const router = useRouter();
    const [antdPhone, setAntdPhone] = useState("+380");
    const [form] = Form.useForm();
    const [formPassword] = Form.useForm();
    const [isPasswordOpenm, setIsPasswordOpen] = useState(false);
    const [componentDisabled, setComponentDisabled] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [codeDeliveryDetails, setCodeDeliveryDetails] = useState<{ destination?: string } | null>(null);
    const [confirmationForm] = Form.useForm();
    const [isStudent, setIsStudent] = useState(false);
    const [isMod, setIsMod] = useState(false);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        given_name: '',
        family_name: '',
        email: '',
        'custom:Degree': '',
        phone_number: '',
    });


    //Author: Jonty Hourn
    //Description: this function checks if a user is signed in and redirects to the sign-in page if not.
    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    setLoading(false);
                }
            } catch {
                console.log("No user signed in");
                await signOut();
                router.push("/signin");

            }
        };
        checkUser();
    }, [router]);

    //Description: this function fetches user attributes and updates the form data.   
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!loading) {
                try {
                    const userAttributes = await fetchUserAttributes();

                    const updatedFormData = {
                        given_name: userAttributes['given_name'] || '',
                        family_name: userAttributes['family_name'] || '',
                        email: userAttributes['email'] || '',
                        'custom:Degree': userAttributes['custom:Degree'] || '',
                        phone_number: userAttributes['phone_number'] || '',
                    };
                    const { tokens } = await fetchAuthSession();
                    const groups = tokens?.accessToken.payload["cognito:groups"] || [];
                    if (groups == ("Student")) {
                        setIsStudent(true);
                    }
                    else if (groups == ("Moderator")) {
                        setIsMod(true);
                    }
                    else {
                        setIsStudent(false);
                    }
                    setFormData(updatedFormData);

                    // Dynamically update the form fields with the fetched data
                    form.setFieldsValue(updatedFormData);
                } catch (error) {
                    console.error("Error fetching user attributes:", error);
                    await signOut();
                    router.push('/signin');
                }
            }
        };

        fetchUserInfo();
    }, [router, form, loading]);
    
    //Description: this function handles the update of user attributes.
    const handleUpdateUserAttribute = async (attributeKey: string, value: string) => {
        try {
            const output = await updateUserAttribute({
                userAttribute: {
                    attributeKey,
                    value,
                },
            });
            if (isStudent) {
                const userProfie = await client.models.Student.list({
                    authMode: "userPool"
                });
                if (userProfie.data.length > 0) {
                    const userProfileId = userProfie.data[0].id;
                    switch (attributeKey) {
                        case 'given_name':
                            await client.models.Student.update({
                                id: userProfileId,
                                fristName: value,
                            }, { authMode: "userPool" });
                            break;
                        case 'family_name':
                            await client.models.Student.update({
                                id: userProfileId,
                                lastName: value,
                            }, { authMode: "userPool" });
                            break;
                        case 'email':
                            await client.models.Student.update({
                                id: userProfileId,
                                email: value,
                            }, { authMode: "userPool" });
                            break;
                        case 'phone_number':
                            await client.models.Student.update({
                                id: userProfileId,
                                phone: value,
                            }, { authMode: "userPool" });
                            break;
                        case 'custom:Degree':
                            await client.models.Student.update({
                                id: userProfileId,
                                degree: value,
                            }, { authMode: "userPool" });
                            break;
                        default:
                            console.warn(`No action defined for attribute key: ${attributeKey}`);
                            break;
                    }
                } else {
                    console.warn("No user profile found to update.");
                }
            }
            handleUpdateUserAttributeNextSteps(output);
        } catch (error) {
            console.error("Error updating user attribute:", error);
        }
    };
    //Description: this function is called if an attribute update requires confirmation via a code sent to the user.
    const handleUpdateUserAttributeNextSteps = (output: UpdateUserAttributeOutput) => {
        const { nextStep } = output;

        switch (nextStep.updateAttributeStep) {
            case 'CONFIRM_ATTRIBUTE_WITH_CODE':
                setCodeDeliveryDetails(nextStep.codeDeliveryDetails || null);
                setIsModalVisible(true);
                break;
            case 'DONE':
                console.log(`Attribute was successfully updated.`);
                break;
        }
    };
    //Description: this section handles the modal for confirmation of user attributes after an update that requires a confirmation code.
    const handleModalOk = async () => {
        try {
            const values = await confirmationForm.validateFields();
            const { confirmationCode } = values;

            await confirmUserAttribute({ userAttributeKey: 'email', confirmationCode });
            setIsModalVisible(false);
            Modal.success({
                title: 'Confirmation Successful',
                content: 'Your changes have been successfully confirmed.',
            });
        } catch (error) {
            console.error('Error confirming attribute update:', error);
            Modal.error({
                title: 'Confirmation Failed',
                content: 'The confirmation code is invalid or expired. Please try again.',
            });
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };
    //End of Section

    //Decription: this function handles when a user submits the form to update their personal information.
    // It checks if any of the form fields have changed and updates the user attributes accordingly.
    const handleFormSubmit = async (values: { firstName: string; lastName: string; email: string; phone: string; 'custom:Degree': string }) => {
        for (const [key, value] of Object.entries(values)) {
            if (formData[key as keyof typeof formData] !== value) {
                await handleUpdateUserAttribute(key, value as string);
            }
        }
        const userAttributes = await fetchUserAttributes();
        setFormData({
            given_name: userAttributes['given_name'] || '',
            family_name: userAttributes['family_name'] || '',
            email: userAttributes['email'] || '',
            'custom:Degree': userAttributes['custom:Degree'] || '',
            phone_number: userAttributes['phone_number'] || '',
        });
        setComponentDisabled(true);
    };


    const handleCancel = () => {
        form.resetFields();
        setComponentDisabled(true);
    };
    //Description: this section handles the modal for changing the user's password.

    const showPasswordRestModal = () => {
        setIsPasswordOpen(true);
    };

    const handlePasswordChange = async (values: { oldPassword: string; newPassword: string }) => {
        try {
            const { oldPassword, newPassword } = values;
            await updatePassword({
                oldPassword,
                newPassword,
            });
            setIsPasswordOpen(false);
            Modal.success({
                title: 'Password Updated',
                content: 'Your password has been successfully updated.',
            });
        } catch (error) {
            console.error('Error updating password:', error);
            Modal.error({
                title: 'Password Update Failed',
                content: 'There was an error updating your password. Please try again.',
            });
        }
    };
    
    const handlePasswordCancel = () => {
        setIsPasswordOpen(false);
    };
    //end of Section

    const handleSignOut = async () => {
        await signOut();
        router.push('/signin');
    };


    const [galleryItems, setGalleryItems] = useState<Project[]>([]);

    //Description: this function fetches the gallery items for the student.
    React.useEffect(() => {
        if (!loading) {
            async function fetchGalleryItems() {
                const studentData = await client.models.Student.list({
                    filter: {
                        profileOwner: {
                            eq: await getCurrentUser().then(id => id?.userId)
                        }
                    }
                ,  authMode: "userPool" });
                if (studentData.data.length > 0) {
                    const studentId = studentData.data[0].id;
                    const galleryData = await client.models.ProjectsStudents.list({
                        filter: {
                            studentId: {
                                eq: studentId
                            }
                        }
                    , authMode: "userPool" });
                    const projectIds = galleryData.data.map((item) => item.projectId);
                    const projects = await Promise.all(
                        projectIds.map(async (projectId) => {
                            return await client.models.Projects.get({
                                id: projectId
                            }, { authMode: "userPool" });
                        })
                    );
                    setGalleryItems(projects.map((project) => project.data as Project));
                }
            }
            fetchGalleryItems();
        }
    }, [loading]);
    
    //Description: this section defines the columns for the gallery table.
    const colums: TableProps<Project>['columns'] = [
        {
            title: 'Cover Image',
            dataIndex: 'ProjectCoverImagePath',
            key: 'image',
            render: (image) => (
                <ImageRenderer imagePath={image} />
            ),
        },{
            title: 'Project Title',
            dataIndex: 'projectTitle',
        },
        {
            title: 'Status',
            dataIndex: 'projectStatus',
        },
    ];

    //Description: this component renders the image for the gallery items.
    const ImageRenderer = ({ imagePath }: { imagePath: string }) => {
        const [imageUrl, setImageUrl] = useState<string | null>(null);

        useEffect(() => {
            const fetchImageUrl = async () => {
                try {
                    const url = (await getUrl({path: imagePath})).url;
                    setImageUrl(url.toString());
                } catch (error) {
                    console.error("Error fetching image URL:", error);
                }
            };
            fetchImageUrl();
        }, [imagePath]);

        return (
            imageUrl &&
            <Image
                src={imageUrl}
                alt="Project Cover"
                width={'auto'}
                height={'auto'}
                style={{ maxHeight: '100px', minWidth: '50px'
                 }}
                preview={false}
                className="rounded-lg"
            />
        );
    };
    //End of Author: Jonty Hourn
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
    }
    return (
        <div className="flex justify-center items-center p-3 rounded-xl">
            <div className="flex flex-col py-4 w-3/4 md:w-1/2 lg:w-1/3 mb-10">
                <Card className="w-full p-10" style={{ backgroundColor: "#f3f4f6", borderRadius: 0 }}>
                        <div className="flex justify-center items-center">
                            <div className="flex flex-col justify-center items-center text-[#001641] space-y-0 mb-8">
                            <h1 className="text-3xl font-bold text-center">{formData.given_name} {formData.family_name}</h1>
                            {isStudent && <p className="text-xl text-[#0033FF]">Student</p>}
                            {isMod && <p className="text-xl text-[#0033FF]">Moderator</p>}
                            {!isStudent && !isMod && <p className="text-xl text-[#0033FF]">Admin</p>}
                        </div>
                        </div>

                <div className="w-full h-px bg-gray-300"></div>
                <div className="flex flex-row justify-between pt-1 mt-2">
                    <p className="font-bold text-2xl text-[#001641]">Personal Info</p>
                    <div className="flex flex-row gap-2 justify-end items-center">
                        {componentDisabled && <Button onClick={() => setComponentDisabled(false)} style={{ borderRadius: 0, border: "none", backgroundColor: "#0033FF", color: "white", fontWeight: "bold" }}>Edit</Button>}
                        {!componentDisabled && <Button onClick={handleCancel} style={{ borderRadius: 0, border: "none", backgroundColor: "#ED0A00", color: "white", fontWeight: "bold" }}>Cancel</Button>}
                        {!componentDisabled && <Button onClick={form.submit} style={{ borderRadius: 0, border: "none", backgroundColor: "#0033FF", color: "white", fontWeight: "bold" }}>Save</Button>}
                    </div>
                </div>
                <Form
                    form={form}
                    name="editInfo"
                    layout="vertical"
                    disabled={componentDisabled}
                    initialValues={{
                        given_name: formData.given_name,
                        family_name: formData.family_name,
                        email: formData.email,
                        phone_number: formData.phone_number,
                        "custom:Degree": formData["custom:Degree"],
                    }}
                    onFinish={handleFormSubmit}
                >
                    <div className="flex flex-row justify-between gap-10 md:gap-20 ">
                        <div className="grow">
                            <Form.Item
                                label={<span className="text-[#ED0A00] font-semibold text-xl">First Name</span>}
                                name="given_name"
                            >
                                <Input placeholder="First Name" style={{ borderRadius: 0, color: "#001641" }} />
                            </Form.Item>
                        </div>
                        <div className="grow">
                            <Form.Item
                                label={<span className="text-[#ED0A00] font-semibold text-xl">Last Name</span>}
                                name="family_name">
                                <Input placeholder="Last Name" style={{  borderRadius: 0, color: "#001641" }} />
                            </Form.Item>
                        </div>
                    </div>
                    <Form.Item
                        label={<span className="text-[#ED0A00] font-semibold text-xl">Email</span>}
                        name="email">
                        <Input placeholder="Email" style={{ borderRadius: 0, color: "#001641" }} />
                    </Form.Item>
                    <Form.Item
                        label={<span className="text-[#ED0A00] font-semibold text-xl">Phone</span>}
                        name="phone_number">
                        <AntPhone value={antdPhone} onChange={setAntdPhone} inputStyle={{ borderRadius: 0, color: "#001641" }} />
                    </Form.Item>
                    {isStudent &&
                        <Form.Item
                            label="Degree"
                            name="custom:Degree">
                            <DebounceSelect
                                placeholder="Select Degree"
                                showSearch={true}
                                fetchOptions={featchDegreeList}
                                style={{ width: '100%', borderRadius: 0 }}
                                onChange={(value) => {
                                    if (!Array.isArray(value)) {
                                        handleUpdateUserAttribute('custom:Degree', value.label);
                                        setFormData((prev) => ({ ...prev, 'custom:Degree': value.label }));
                                    }
                                }}
                            />
                        </Form.Item>
                    }

                </Form>
                <div className="flex flex-row justify-between">
                    <Button onClick={showPasswordRestModal} style={{ borderRadius: 0, border: "none", backgroundColor: "#0033FF", color: "white", fontWeight: "bold" }}>Change Password</Button>
                    <Button onClick={handleSignOut} style={{ borderRadius: 0, border: "none", backgroundColor: "#ED0A00", color: "white", fontWeight: "bold" }}>Log Out</Button>
                </div>
                <Modal 
                    title={<span className="text-xl text-[#001641] font-bold mb-4">Change Password</span>}
                    open={isPasswordOpenm} onOk={formPassword.submit} onCancel={handlePasswordCancel}>    
                    <Form
                        name="changePassword"
                        layout="vertical"
                        onFinish={handlePasswordChange}
                        form={formPassword}
                    >
                        <Form.Item
                            label={<span className="font-semibold text-lg text-[#001641]">Old Password</span>}
                            name="oldPassword"
                            rules={[{ required: true, message: 'Please enter your old password' }]}
                        >
                            <Input.Password placeholder="Old Password"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 0 }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={<span className="font-semibold text-lg text-[#001641]">New Password</span>}
                            name="newPassword"
                            rules={[{ required: true, message: 'Please input your Password!' },
                            { min: 8, message: 'Password must be at least 8 characters long!' },
                            { pattern: /(?=.*[0-9])/, message: 'Password must contain at least one number!' },
                            { pattern: /(?=.*[!@#$%^&*])/, message: 'Password must contain at least one special character!' },
                            { pattern: /(?=.*[a-z])/, message: 'Password must contain at least one lowercase letter!' },
                            { pattern: /(?=.*[A-Z])/, message: 'Password must contain at least one uppercase letter!' },
                            ]}
                        >
                            <Input.Password placeholder="New Password"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 0 }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={<span className="font-semibold text-lg text-[#001641]">Confirm Password</span>}
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Please confirm your new password' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Passwords do not match!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="Confirm Password"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 0 }}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
                <Modal
                    title="Confirm Sign Up"
                    open={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={handleModalCancel}
                >
                    <Form
                        form={confirmationForm}
                        name="confirmSignUp"
                        layout="vertical"
                    >
                        <p>Confirmation code was sent to {codeDeliveryDetails?.destination || formData.email}:</p>
                        <Form.Item
                            label="Confirmation Code"
                            name="confirmationCode"
                            rules={[{ required: true, message: 'Please enter the confirmation code!' }]}
                        >
                            <Input.OTP length={6} />
                        </Form.Item>
                    </Form>
                </Modal>
                {isStudent &&
                    <div className="py-5">
                    <div className="w-full h-px bg-gray-300"/>
                    
                        <p className="font-bold text-2xl text-[#001641]">My Projects</p>

                        <Table
                            columns={colums}
                            dataSource={galleryItems}
                            pagination={false}
                            rowKey="id"
                            onRow={(record) => ({
                                onClick: () => {
                                    router.push(`/gallery/${record.id}`);
                                }
                            })}
                            className="hover:cursor-pointer pt-4"
                        />
                </div>
               
                }
            </Card>
            </div>

        </div>
    );
}
