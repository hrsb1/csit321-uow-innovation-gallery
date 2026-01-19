//author: Jonty Hourn
//description: This is the post confirmation handler for the amplify auth service.
//based on amplift gen2 documentation
import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/post-confirmation';

// Ensure AMPLIFY_DATA_DEFAULT_NAME is included in the env object
const updatedEnv = {
  ...env,
  AMPLIFY_DATA_DEFAULT_NAME: process.env.AMPLIFY_DATA_DEFAULT_NAME || 'defaultName'
};

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  updatedEnv
);

Amplify.configure(resourceConfig, libraryOptions);

const clientAuth = new CognitoIdentityProviderClient();
const clientData = generateClient<Schema>();


// add user to group
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const command = new AdminAddUserToGroupCommand({
    GroupName: env.GROUP_NAME,
    Username: event.userName,
    UserPoolId: event.userPoolId
  });

  await clientData.models.Student.create({
    email: event.request.userAttributes.email,
    fristName: event.request.userAttributes.given_name,
    lastName: event.request.userAttributes.family_name,
    profileOwner: event.request.userAttributes.sub,
    phone: event.request.userAttributes.phone_number,
    degree: event.request.userAttributes['custom:Degree'],
});

  const response = await clientAuth.send(command);
  console.log('processed', response.$metadata.requestId);
  return event;
};