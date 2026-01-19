//Author: Jonty Hourn: Functioality and basic UI
//        Ian Cuchapin: UI Changes
//        Yoses: Riandy: Degree Filtering
//Description: Sign Up page for Student Registration

"use client";
import { Button, Form, Input, Divider, message, Modal, SelectProps, Select, Spin, Card } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Amplify } from "aws-amplify";
import { signUp, confirmSignUp, resendSignUpCode, autoSignIn } from "aws-amplify/auth";
import React, { useMemo, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { AntPhone } from "@/app/components/AntPhone";
import debounce from "lodash/debounce";
import { generateClient } from 'aws-amplify/data';



import config from "@/../amplify_outputs.json";
Amplify.configure(config, { ssr: true });
import { type Schema } from '../../../../amplify/data/resource';
const client = generateClient<Schema>();

// Attributes: https://ant.design/components/select
export interface DebounceSelectProps<ValueType extends { key?: string; label: React.ReactNode; value: string | number } = { key?: string; label: React.ReactNode; value: string | number }>
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
    authMode: "identityPool",
  });

  const allDegrees = result.data;

  const lowerSearch = search.toLowerCase();

  const scored = allDegrees
    .filter((degree) => degree.degreeName.toLowerCase().includes(lowerSearch))
    .map((degree) => {
      const name = degree.degreeName.toLowerCase();
      let score = 0;
      if (name.startsWith(lowerSearch)) score += 2;
      if (name.includes(lowerSearch)) score += 1;

      return {
        label: toTitleCase(degree.degreeName),
        value: degree.degreeid,
        score,
      };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored.map(({ label, value }) => ({ label, value }));
}

export default function SignUpRoute() {
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [codeDeliveryDetails, setCodeDeliveryDetails] = useState<{ destination?: string } | null>(null);
    const [form] = Form.useForm();
    const [degree, setDegree] = useState<string>();



    interface SignUpFormValues {
        email: string;
        password: string;
        phone: string;
        Given_name: string;
        Family_name: string;
    };


    const onFinish = async (values: SignUpFormValues) => {
        const { email, password, phone, Given_name, Family_name } = values;
        setEmail(email);
        try {
            const output = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        phone_number: phone,
                        given_name: Given_name,
                        family_name: Family_name,
                        'custom:Degree': degree,
                    }, autoSignIn: true,

                },
            });

            const { nextStep } = output;

            switch (nextStep.signUpStep) {
                case 'CONFIRM_SIGN_UP':
                    setCodeDeliveryDetails(nextStep.codeDeliveryDetails);
                    setIsModalVisible(true);
                    message.success('Sign up successful! Please confirm your email.');
                    break;

                case 'DONE':
                    message.success('Sign up completed successfully!');
                    router.push('/account');
                    break;

                case 'COMPLETE_AUTO_SIGN_IN':
                    const autoSignInOutput = await autoSignIn();
                    if (autoSignInOutput.nextStep.signInStep === 'DONE') {
                        message.success('Successfully signed in!');
                        router.push('/account'); // Redirect to the dashboard or another page
                    }
                    break;

                default:
                    console.error('Unknown next step:', nextStep);
                    message.error('An unknown error occurred. Please try again.');
            }
        } catch (error) {
            console.error('Error signing up:', error);
            message.error('Error signing up. Please try again.');
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const { confirmationCode } = values;

            const output = await confirmSignUp({
                username: email,
                confirmationCode,
            });

            const { nextStep } = output;

            switch (nextStep.signUpStep) {
                case 'DONE':
                    console.error('Sign up completed successfully!');
                    message.success('Confirmation successful! Sign-up process is complete.');
                    setIsModalVisible(false);
                    router.push('/account');
                    break;
                case 'COMPLETE_AUTO_SIGN_IN':
                    const autoSignInOutput = await autoSignIn();
                    if (autoSignInOutput.nextStep.signInStep === 'DONE') {
                        message.success('Successfully signed in!');
                        router.push('/account');
                    }
                    break;
                default:
                    console.error('Unknown next step:', nextStep);
                    message.error('An unknown error occurred. Please try again.');
            }
        } catch (error) {
            console.error('Error confirming sign up:', error);
            message.error('Error confirming sign up. Please try again.');
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    return (
        <div className="flex justify-center items-center p-3">
            <div className=" flex justify-center items-center md:w-2/3 lg:w-2/4 xl:w-2/5 w-full p-20 ">
            <Card className="w-full" style={{ backgroundColor: "#f3f4f6", borderRadius: 0 }}>
            <Form
                name="signup"
                onFinish={onFinish}
                layout="vertical"
            >
                <Divider style={{ fontSize: '32px', color: "#001641", fontWeight: "bold" }}>Sign Up</Divider>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Email</span>}
                    name="email"
                    rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email', message: 'Please enter a valid email!' }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input placeholder="Email" style={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Given Name</span>}
                    name="Given_name"
                    rules={[{ required: true, message: 'Please input your Given Name!' }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input placeholder="Given Name" style={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Family Name</span>}
                    name="Family_name"
                    rules={[{ required: true, message: 'Please input your Family Name!' }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input placeholder="Family Name" style={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Phone Number</span>}
                    name="phone"
                    rules={[{ required: true, message: 'Please input your Mobile Number!' }]}
                    style={{ marginBottom: 10 }}
                >
                    <AntPhone value={email} onChange={setEmail} inputStyle={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Degree</span>}
                    name="degree"
                    rules={[{ required: true, message: 'Please select your Degree!' }]}
                >
                    <DebounceSelect
                        placeholder="Enter Degree"
                        showSearch={true}
                        fetchOptions={featchDegreeList}
                        style={{ width: '100%', borderRadius: 0 }}
                        onChange={(value) => {
                            if (Array.isArray(value)) {
                                setDegree(value[0]?.label || '');
                            } else {
                                setDegree(value.label);
                            }
                        }}
                    />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Password</span>}
                    name="password"
                    rules={[{ required: true, message: 'Please input your Password!' }, 
                        { min: 8, message: 'Password must be at least 8 characters long!' },
                        { pattern: /(?=.*[0-9])/, message: 'Password must contain at least one number!' },
                        { pattern: /(?=.*[!@#$%^&*])/, message: 'Password must contain at least one special character!' },
                        { pattern: /(?=.*[a-z])/, message: 'Password must contain at least one lowercase letter!' },
                        { pattern: /(?=.*[A-Z])/, message: 'Password must contain at least one uppercase letter!' },
                    ]}
                    style={{ marginBottom: 10 }}
                >
                    <Input.Password
                        placeholder="Password"
                        style={{ borderRadius: 0 }}
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>
                <Form.Item
                    label={<span className="text-[#001641] font-semibold text-xl">Confirm Password</span>}
                    name="password2"
                    dependencies={['password']}
                    rules={[
                        { required: true, message: 'Please confirm your password!' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Passwords do not match!'));
                            },
                        }),
                    ]}
                    style={{ marginBottom: 30}}
                >
                    <Input.Password
                        placeholder="Confirm Password"
                        style={{ borderRadius: 0 }}
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>
                <Form.Item>
                        <Button block type="primary" htmlType="submit" style={{ borderRadius: 0 }}>
                        Sign Up
                        </Button>
                </Form.Item>

                <div className="text-start text-lg -mt-4">
                    or <a href="/signin" className="hover:text-[#ED0A00]">Sign In</a>
                </div>
            </Form>
            </Card>
            <Modal
                title="Confirm Sign Up"
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
            >
                <Form
                    form={form}
                    name="confirmSignUp"
                    layout="vertical"
                >
                    <p>Confirmation code was sent to {codeDeliveryDetails?.destination || email}:</p>
                    <Form.Item
                        label="Confirmation Code"
                        name="confirmationCode"
                        rules={[{ required: true, message: 'Please enter the confirmation code!' }]}
                    >
                        <Input.OTP length={6} />
                    </Form.Item>
                </Form>
                <Button onClick={() => resendSignUpCode({ username: email })}>
                    Resend Code
                </Button>
            </Modal>
            </div>
        </div>
    );
}
