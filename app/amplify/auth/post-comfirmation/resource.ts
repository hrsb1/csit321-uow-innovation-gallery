//Author: Jonty
//Description: This is the post confirmation resource definition for the amplify auth service.
//based on amplift gen2 documentation
import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
    environment: {
    GROUP_NAME: 'Student'
  },
  resourceGroupName: 'auth, data',
});