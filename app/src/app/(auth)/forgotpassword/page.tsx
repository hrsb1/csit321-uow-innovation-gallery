//Author: Jonty Hourn: Functioality and basic UI
//        Ian Cuchapin: UI Changes
//Description: This is the forgot password page for the application. It allows users to reset their password by entering their email and receiving a confirmation code.
"use client"
import { Button, Form, Divider, Input, Modal, Card } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, UserOutlined } from '@ant-design/icons'
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";
import { Amplify } from "aws-amplify";
import React, { useState } from "react";
import { useRouter } from 'next/navigation'

import config from '@/../amplify_outputs.json'
Amplify.configure(config, { ssr: true });

export default function ForgotPasswordRoute() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [codeDeliveryDetails, setCodeDeliveryDetails] = useState<{ destination?: string } | null>(null);
    const [form] = Form.useForm();

    const onFinish = async (values: { Email: string }) => {
        const { Email } = values;
        setEmail(Email);
        try {
            const output = await resetPassword({ username: Email });
            const { nextStep } = output;
            if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
                setCodeDeliveryDetails(nextStep.codeDeliveryDetails);
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error('Error sending reset password request:', error);
            Modal.error({
                title: 'Reset Password Failed',
                content: 'There was an error sending the reset password request. Please try again.',
            });
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const { confirmationCode, newPassword } = values;
            await confirmResetPassword({
                username: email,
                confirmationCode,
                newPassword,
            });
            setIsModalOpen(false);
            Modal.success({
                title: 'Password Updated',
                content: 'Your password has been successfully updated.',
            });
            router.push('/signin');
        } catch (error) {
            console.error('Error confirming reset password:', error);
            Modal.error({
                title: 'Password Update Failed',
                content: 'There was an error updating your password. Please try again.',
            });
        }
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="flex justify-center items-center p-3 rounded-xl">
            <div className="flex justify-center items-center md:w-1/2 lg:w-1/3 xl:w-1/4 w-full p-32">
            <Card className="w-full" style={{ backgroundColor: "#f3f4f6", borderRadius: 0 }}>
            <Form
                    name="Forgot Password"
                    onFinish={onFinish}
                >
                    <Divider style={{ fontSize: '32px', color: "#001641", fontWeight: "bold" }} >Forgot Password</Divider>
                    <Form.Item
                        name="Email"
                        rules={[{ required: true, message: "Please enter your email" }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" style={{ borderRadius: 0 }} />
                    </Form.Item>
                    <Form.Item>
                        <Button block type="primary" htmlType="submit" style={{ borderRadius: 0 }}>Submit</Button>
                    </Form.Item>
                </Form>
                <div className="flex gap-2 mb-10">
                    <Button block type="primary" href="/signin" style={{ borderRadius: 0 }}>Sign In</Button>
                    <Button block type="primary" href="/signup" style={{ borderRadius: 0 }}>Sign Up</Button>
                </div>
            </Card>
            </div>

            <Modal
                title="Reset Password"
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
            >
                <Form
                    form={form}
                    name="resetPassword"
                    layout="vertical"
                >
                    <p>Confirmation code was sent to {codeDeliveryDetails?.destination}</p>
                    <Form.Item
                        label="Confirmation Code"
                        name="confirmationCode"
                        rules={[{ required: true, message: 'Please enter the confirmation code' }]}
                    >
                        <Input.OTP length={6} />
                    </Form.Item>
                    <Form.Item
                        label="New Password"
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
/>
                    </Form.Item>
                    <Form.Item
                        label="Confirm Password"
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
 />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
