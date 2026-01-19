//Author: Jonty
//Description: this defines the data resource for the amplify backend.
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-comfirmation/resource';

const schema = a.schema({
  Projects: a
    .model({
      projectTitle: a.string(),
      projectBackground: a.string(),
      projectTechnology: a.string(),
      projectBenefits: a.string(),
      projectTags: a.string().array(),
      projectApplication: a.string(),
      ProjectCoverImagePath: a.string().default('images/default.png'),
      projectYear: a.string(),
      projectOtherImagePath: a.string().array(),
      projectStatus: a.enum(['Pending', 'Approved', 'Rejected', 'PendingEdit']),
      projectModComments: a.string(),
      students: a.hasMany('ProjectsStudents', 'projectId'),
      projectOwners: a.string().array(),
      projedctRejectReason: a.string(),
      investors: a.hasMany('InvestorInterest', 'projectId'),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
      allow.group('Student').to(['read']),
      allow.ownersDefinedIn('projectOwners'),
    ]),

  Student: a
    .model({
      fristName: a.string().required().authorization(allow => [
        allow.guest().to(['read']),
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.group('Student').to(['read']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),

      ]),
      lastName: a.string().required().authorization(allow => [
        allow.guest().to(['read']),
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.group('Student').to(['read']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
      email: a.string().authorization(allow => [
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.group('Student').to(['read']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
      phone: a.string().authorization(allow => [
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
      degree: a.string().authorization(allow => [
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
      profileOwner: a.string().authorization(allow => [
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
      project: a.hasMany('ProjectsStudents', 'studentId').authorization(allow => [
        allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
        allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
        allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
      ]),
    }).authorization((allow) => [
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group("Moderator").to(['create', 'read', 'update', 'delete']),
      allow.ownerDefinedIn('profileOwner').to(['read', 'update']),
    ]),

  ProjectsStudents: a
    .model({
      projectId: a.id().required(),
      studentId: a.id().required(),
      project: a.belongsTo('Projects', 'projectId'),
      student: a.belongsTo('Student', 'studentId'),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
      allow.group('Student').to(['read']),
      allow.owner(),
    ]),

  InvestorInterest: a
    .model({
      projectId: a.id().required(),
      project: a.belongsTo('Projects', 'projectId'),
      investorName: a.string().required(),
      investorEmail: a.string().required(),
      investorPhone: a.string().required(),
      investorCompany: a.string().required(),
      investorReson: a.string().required(),
      message: a.string().required(),
      ModComments: a.string(),
      statusCatagory: a.enum(['New', 'Pending', 'Closed', 'Rejected']),
      status: a.string(),

    }).authorization((allow) => [
      allow.guest().to(['create']),
      allow.group('Student').to(['read']),
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
    ]),

  Degree: a
    .model({
      degreeName: a.string().required(),
      degreeid: a.string().required(),
    })
    .authorization((allow) => [
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
      allow.group('Student').to(['read']),
      allow.guest().to(['read']),
    ]),

  Tags: a
    .model({
      tagName: a.string().required(),
    }).authorization((allow) => [
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
      allow.group('Student').to(['read']),
      allow.guest().to(['read']),
    ]),

  ContactReasons: a
    .model({
      reasonName: a.string().required(),
    }).authorization((allow) => [
      allow.group('ADMINS').to(['create', 'read', 'update', 'delete']),
      allow.group('Moderator').to(['create', 'read', 'update', 'delete']),
      allow.group('Student').to(['read']),
      allow.guest().to(['read']),
    ]),
}).authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema
})