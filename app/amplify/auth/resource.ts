//Author: Jonty
//Description: This Defines the auth resource for the amplify backend.
//based on amplift gen2 documentation
import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from "./post-comfirmation/resource"



/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  groups: ["ADMINS", "Moderator", "Student"],
  triggers: {
    postConfirmation,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
  ],

  userAttributes:{
    phoneNumber: {
      mutable: true,
      required: true,
    },
    givenName:{
      mutable: true,
      required: true,
    },
    familyName:{
      mutable: true,
      required: true,
    },
    "custom:Degree":{      
      dataType: "String",
      mutable: true,
    }
  },
  
});