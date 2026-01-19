//Author: Jonty
//Description: This Defines the Storages for images for projects in the amplify backend.
import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplify-gen2-files",
  access: (allow) => ({
    "images/*": [allow.groups(['Student']).to(['write', 'read']), allow.guest.to(['read']), allow.groups(['ADMINS']).to(['write', 'read', 'delete'])],
  }),
});