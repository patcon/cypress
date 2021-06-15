/* eslint-disable */
/**
 * This file was generated by Nexus Schema
 * Do not make changes to this file directly
 */


import type { AppOptions } from "./../entities/AppOptions"
import type { Node } from "./../entities/Node"
import type { File } from "./../entities/File"
import type { Project } from "./../entities/Project"
import type { App } from "./../entities/App"
import type { Browser } from "./../entities/Browser"
import type { Dashboard } from "./../entities/Dashboard"
import type { Experiment } from "./../entities/Experiment"
import type { Folder } from "./../entities/Folder"
import type { Organization } from "./../entities/Organization"
import type { ProjectConfig } from "./../entities/ProjectConfig"
import type { Release } from "./../entities/Release"
import type { User } from "./../entities/User"
import type { core, connectionPluginCore } from "nexus"

declare global {
  interface NexusGenCustomOutputMethods<TypeName extends string> {
    /**
     * Adds a Relay-style connection to the type, with numerous options for configuration
     *
     * @see https://nexusjs.org/docs/plugins/connection
     */
    connection<FieldName extends string>(
      fieldName: FieldName,
      config: connectionPluginCore.ConnectionFieldConfig<TypeName, FieldName>
    ): void
  }
}


declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
}

export interface NexusGenEnums {
  SpecType: "component" | "integration"
}

export interface NexusGenScalars {
  String: string
  Int: number
  Float: number
  Boolean: boolean
  ID: string
}

export interface NexusGenObjects {
  App: App;
  AppOptions: AppOptions;
  Browser: Browser;
  Dashboard: Dashboard;
  Experiment: Experiment;
  File: File;
  Folder: Folder;
  Mutation: {};
  Organization: Organization;
  Project: Project;
  ProjectConfig: ProjectConfig;
  Query: {};
  Release: Release;
  User: User;
}

export interface NexusGenInterfaces {
  Node: Node;
}

export interface NexusGenUnions {
}

export type NexusGenRootTypes = NexusGenInterfaces & NexusGenObjects

export type NexusGenAllTypes = NexusGenRootTypes & NexusGenScalars & NexusGenEnums

export interface NexusGenFieldTypes {
  App: { // field return type
    cypressVersion: string | null; // String
    field: string | null; // String
    name: string | null; // String
    options: NexusGenRootTypes['AppOptions'] | null; // AppOptions
    recentProjects: Array<NexusGenRootTypes['Project'] | null> | null; // [Project]
  }
  AppOptions: { // field return type
    cypressEnv: string | null; // String
    os: string | null; // String
    projectRoot: string | null; // String
    proxyBypassList: string | null; // String
    proxyServer: string | null; // String
    proxySource: string | null; // String
    todo: string | null; // ID
  }
  Browser: { // field return type
    todo: string | null; // ID
  }
  Dashboard: { // field return type
    todo: string | null; // ID
  }
  Experiment: { // field return type
    todo: string | null; // ID
  }
  File: { // field return type
    id: string | null; // ID
    todo: string | null; // ID
  }
  Folder: { // field return type
    displayName: string | null; // String
    hasChildren: boolean | null; // Boolean
    path: string | null; // String
    specType: NexusGenEnums['SpecType'] | null; // SpecType
  }
  Mutation: { // field return type
    addProject: NexusGenRootTypes['Query'] | null; // Query
    closeBrowser: NexusGenRootTypes['Query'] | null; // Query
    closeProject: NexusGenRootTypes['Query'] | null; // Query
    externalOpen: boolean | null; // Boolean
    logOut: NexusGenRootTypes['Query'] | null; // Query
    removeProject: NexusGenRootTypes['Query'] | null; // Query
    setScaffoldPaths: NexusGenRootTypes['ProjectConfig'] | null; // ProjectConfig
  }
  Organization: { // field return type
    name: string | null; // String
    todo: string | null; // ID
  }
  Project: { // field return type
    name: string | null; // String
    organization: NexusGenRootTypes['Organization'] | null; // Organization
    sortedSpecsList: Array<NexusGenRootTypes['File'] | null> | null; // [File]
  }
  ProjectConfig: { // field return type
    todo: string | null; // ID
  }
  Query: { // field return type
    app: NexusGenRootTypes['App']; // App!
    currentProject: NexusGenRootTypes['Project'] | null; // Project
    projects: Array<NexusGenRootTypes['Project'] | null> | null; // [Project]
  }
  Release: { // field return type
    todo: string | null; // ID
  }
  User: { // field return type
    displayName: string | null; // String
    email: string | null; // String
    name: string | null; // String
  }
  Node: { // field return type
    id: string | null; // ID
  }
}

export interface NexusGenFieldTypeNames {
  App: { // field return type name
    cypressVersion: 'String'
    field: 'String'
    name: 'String'
    options: 'AppOptions'
    recentProjects: 'Project'
  }
  AppOptions: { // field return type name
    cypressEnv: 'String'
    os: 'String'
    projectRoot: 'String'
    proxyBypassList: 'String'
    proxyServer: 'String'
    proxySource: 'String'
    todo: 'ID'
  }
  Browser: { // field return type name
    todo: 'ID'
  }
  Dashboard: { // field return type name
    todo: 'ID'
  }
  Experiment: { // field return type name
    todo: 'ID'
  }
  File: { // field return type name
    id: 'ID'
    todo: 'ID'
  }
  Folder: { // field return type name
    displayName: 'String'
    hasChildren: 'Boolean'
    path: 'String'
    specType: 'SpecType'
  }
  Mutation: { // field return type name
    addProject: 'Query'
    closeBrowser: 'Query'
    closeProject: 'Query'
    externalOpen: 'Boolean'
    logOut: 'Query'
    removeProject: 'Query'
    setScaffoldPaths: 'ProjectConfig'
  }
  Organization: { // field return type name
    name: 'String'
    todo: 'ID'
  }
  Project: { // field return type name
    name: 'String'
    organization: 'Organization'
    sortedSpecsList: 'File'
  }
  ProjectConfig: { // field return type name
    todo: 'ID'
  }
  Query: { // field return type name
    app: 'App'
    currentProject: 'Project'
    projects: 'Project'
  }
  Release: { // field return type name
    todo: 'ID'
  }
  User: { // field return type name
    displayName: 'String'
    email: 'String'
    name: 'String'
  }
  Node: { // field return type name
    id: 'ID'
  }
}

export interface NexusGenArgTypes {
}

export interface NexusGenAbstractTypeMembers {
  Node: "File"
}

export interface NexusGenTypeInterfaces {
  File: "Node"
}

export type NexusGenObjectNames = keyof NexusGenObjects;

export type NexusGenInputNames = never;

export type NexusGenEnumNames = keyof NexusGenEnums;

export type NexusGenInterfaceNames = keyof NexusGenInterfaces;

export type NexusGenScalarNames = keyof NexusGenScalars;

export type NexusGenUnionNames = never;

export type NexusGenObjectsUsingAbstractStrategyIsTypeOf = never;

export type NexusGenAbstractsUsingStrategyResolveType = "Node";

export type NexusGenFeaturesConfig = {
  abstractTypeStrategies: {
    isTypeOf: false
    resolveType: true
    __typename: false
  }
}

export interface NexusGenTypes {
  context: any;
  inputTypes: NexusGenInputs;
  rootTypes: NexusGenRootTypes;
  inputTypeShapes: NexusGenInputs & NexusGenEnums & NexusGenScalars;
  argTypes: NexusGenArgTypes;
  fieldTypes: NexusGenFieldTypes;
  fieldTypeNames: NexusGenFieldTypeNames;
  allTypes: NexusGenAllTypes;
  typeInterfaces: NexusGenTypeInterfaces;
  objectNames: NexusGenObjectNames;
  inputNames: NexusGenInputNames;
  enumNames: NexusGenEnumNames;
  interfaceNames: NexusGenInterfaceNames;
  scalarNames: NexusGenScalarNames;
  unionNames: NexusGenUnionNames;
  allInputTypes: NexusGenTypes['inputNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['scalarNames'];
  allOutputTypes: NexusGenTypes['objectNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['unionNames'] | NexusGenTypes['interfaceNames'] | NexusGenTypes['scalarNames'];
  allNamedTypes: NexusGenTypes['allInputTypes'] | NexusGenTypes['allOutputTypes']
  abstractTypes: NexusGenTypes['interfaceNames'] | NexusGenTypes['unionNames'];
  abstractTypeMembers: NexusGenAbstractTypeMembers;
  objectsUsingAbstractStrategyIsTypeOf: NexusGenObjectsUsingAbstractStrategyIsTypeOf;
  abstractsUsingStrategyResolveType: NexusGenAbstractsUsingStrategyResolveType;
  features: NexusGenFeaturesConfig;
}


declare global {
  interface NexusGenPluginTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginInputTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginFieldConfig<TypeName extends string, FieldName extends string> {
    
  }
  interface NexusGenPluginInputFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginSchemaConfig {
  }
  interface NexusGenPluginArgConfig {
  }
}