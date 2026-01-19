//Author: Jonty Hourn: Functioality and basic UI
//        Ian Cuchapin: UI Changes
//Description: signin page for website.
"use client";

import React, { useEffect, useState } from "react";
import { Button, Form, Input, Divider, Modal, message, Card } from "antd";
import { LockOutlined, UserOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Amplify } from "aws-amplify";
import {
  signIn,
  getCurrentUser,
  confirmSignUp,
  confirmSignIn,
  resendSignUpCode,
  SignInOutput,
  fetchAuthSession,
} from "aws-amplify/auth";

import config from "@/../amplify_outputs.json";
Amplify.configure(config, { ssr: true });

const SignInRoute = () => {
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [email, setEmail] = useState("");
  const [form] = Form.useForm();
  const [resetform] = Form.useForm();

  // Check if a user is already signed in
  useEffect(() => {
    const checkUser = async () => {
      try {
        await getCurrentUser();
        router.push("/account");
      } catch {
      }
    };
    checkUser();
  }, [router]);

  // Handle user sign-in
  const handleSignIn = async (values: { username: string; password: string }) => {
    const { username, password } = values;
    try {
      const user = await signIn({ username, password, options: { autoSignIn: true } });
      setEmail(username);
      handleSignInNextSteps(user);
    } catch (error) {
      console.error("Error signing in:", error);
      message.error("Error signing in. Please check your credentials.");
    }
  };

  // Handle next steps after sign-in
  const handleSignInNextSteps = async (output: SignInOutput) => {
    const { nextStep } = output;
    switch (nextStep.signInStep) {
      case "CONFIRM_SIGN_UP":
        setIsModalVisible(true);
        break;
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        setIsForgotPassword(true);
        break;
      case "DONE":
        try {
          const { tokens } = await fetchAuthSession();
          const groups = tokens?.accessToken.payload["cognito:groups"] || [];
          if (groups == ("ADMINS")) {
            router.push("/admin");
          } else {
            router.push("/account");
          }
        } catch (error) {
          console.error("Error fetching user groups:", error);
          message.error("An error occurred. Please try again.");
        }
        break;
      default:
        console.log("Unhandled sign-in step:", nextStep.signInStep);
    }
  };

  // Handle confirmation of sign-up
  const handleConfirmation = async () => {
    try {
      const user = await confirmSignUp({ username: email, confirmationCode, options: { autoSignIn: true } });
      message.success("Confirmation successful!");
      setIsModalVisible(false);
      if (user.nextStep.signUpStep == "COMPLETE_AUTO_SIGN_IN") {
        const { tokens } = await fetchAuthSession();
        const groups = tokens?.accessToken.payload["cognito:groups"] || [];
        if (groups == ("ADMINS")) {
          router.push("/admin");
        } else {
          router.push("/account");
        }
      }
    } catch (error) {
      console.error("Error confirming sign up:", error);
      message.error("Error confirming sign up. Please try again.");
    }
  };

  // Handle forced password reset
  const handleForcePassword = async (values: { newPassword: string }) => {
    const { newPassword } = values;
    try {
      const user = await confirmSignIn({ challengeResponse: newPassword, options: { autoSignIn: true } });
      message.success("Password reset successful!");
      setIsForgotPassword(false);
      if (user.nextStep.signInStep === "DONE") {
        const { tokens } = await fetchAuthSession();
        const groups = tokens?.accessToken.payload["cognito:groups"] || [];
        if (groups == ("ADMINS")) {
          router.push("/admin");
        } else {
          router.push("/account");
        }
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      message.error("Error resetting password. Please try again.");
    }
  };

  // Resend confirmation code
  const handleResendCode = async () => {
    try {
      await resendSignUpCode({ username: email });
      message.success("Confirmation code resent!");
    } catch (error) {
      console.error("Error resending code:", error);
      message.error("Error resending code. Please try again.");
    }
  };

  // Login form component
  const LoginForm = () => (
    <Card className="md:w-2/3 lg:w-3/5 xl:w-1/4 w-full p-10" style={{ backgroundColor: "#f3f4f6", borderRadius: 0 }}>
    <Form name="login" form={form} onFinish={handleSignIn}>
      <Divider style={{ fontSize: '32px', color: "#001641", fontWeight: "bold" }}>Sign In</Divider>
      <Form.Item
        name="username"
        rules={[{ required: true, message: "Please input your Username!" }]}
      >
        <Input prefix={<UserOutlined />} style={{ borderRadius: 0 }} placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "Please input your Password!" }]}
      >
        <Input.Password prefix={<LockOutlined />} style={{ borderRadius: 0 }} placeholder="Password" iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
      </Form.Item>

      <div className="mb-5 -mt-5 text-right">
        <a href="/forgotpassword" className="text-lg hover:text-[#ED0A00]">
          Forgot password?
        </a>
      </div>

      <Form.Item>
          <Button block type="primary" htmlType="submit" style={{ borderRadius: 0 }}>
            Log in
          </Button>
      </Form.Item>

      <div className="text-start text-lg -mt-4">
        or <a href="/signup" className="hover:text-[#ED0A00]">Register Now</a>
      </div>
    </Form>
    </Card>
  );

  // Confirmation modal component
  const ConfirmationModal = () => (
    <Modal
      title="Confirm Sign Up"
      open={isModalVisible}
      onOk={handleConfirmation}
      onCancel={() => setIsModalVisible(false)}
    >
      <p>Please enter the confirmation code sent to your email:</p>
      <Input
        value={confirmationCode}
        onChange={(e) => setConfirmationCode(e.target.value)}
        placeholder="Confirmation Code"
      />
      <Button onClick={handleResendCode}>Resend Code</Button>
    </Modal>
  );

  // Password reset modal component
  const PasswordResetModal = () => (
    <Modal
      title="New Password"
      open={isForgotPassword}
      onOk={resetform.submit}
      onCancel={() => setIsForgotPassword(false)}
    >
      <p>Please enter your new password:</p>
      <Form
        name="resetPassword"
        form={resetform}
        onFinish={handleForcePassword}
      >
        <Form.Item
          name="newPassword"
          rules={[{ required: true, message: 'Please input your Password!' },
          { min: 8, message: 'Password must be at least 8 characters long!' },
          { pattern: /(?=.*[0-9])/, message: 'Password must contain at least one number!' },
          { pattern: /(?=.*[!@#$%^&*])/, message: 'Password must contain at least one special character!' },
          { pattern: /(?=.*[a-z])/, message: 'Password must contain at least one lowercase letter!' },
          { pattern: /(?=.*[A-Z])/, message: 'Password must contain at least one uppercase letter!' },
          ]}
        >
          <Input.Password
            placeholder="New Password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}

          />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div className="flex justify-center items-center mt-32">
      <LoginForm />
      <ConfirmationModal />
      <PasswordResetModal />
    </div>
  );
};

export default SignInRoute;
