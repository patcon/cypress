import AU from 'ansi_up'
/* eslint-disable no-console */
import chalk from 'chalk'
import _ from 'lodash'
import path from 'path'
import stripAnsi from 'strip-ansi'
import { humanTime, logError, parseResolvedPattern, pluralize } from './errorUtils'
import { errPartial, errTemplate, fmt, theme, PartialErr } from './errTemplate'
import { stackWithoutMessage } from './stackUtils'

import type { ClonedError, ConfigValidationError, CypressError, ErrorLike, ErrTemplateResult } from './errorTypes'

const ansi_up = new AU()

ansi_up.use_classes = true

const displayRetriesRemaining = function (tries: number) {
  const times = tries === 1 ? 'time' : 'times'

  const lastTryNewLine = tries === 1 ? '\n' : ''

  return fmt.meta(
    `We will try connecting to it ${tries} more ${times}...${lastTryNewLine}`,
  )
}

const getUsedTestsMessage = (limit: number, usedTestsMessage: string) => {
  return _.isFinite(limit)
    ? fmt.off(`The limit is ${chalk.yellow(`${limit}`)} ${usedTestsMessage} results.`)
    : fmt.off('')
}

export const warnIfExplicitCiBuildId = function (ciBuildId?: string | null) {
  if (!ciBuildId) {
    return null
  }

  return errPartial`\
It also looks like you also passed in an explicit ${fmt.flag('--ci-build-id')} flag.

This is only necessary if you are NOT running in one of our supported CI providers.

This flag must be unique for each new run, but must also be identical for each machine you are trying to --group or run in --parallel.\
`
}

/**
 * All Cypress Errors should be defined here:
 *
 * The errors must return an "errTemplate", this is processed by the
 */
export const AllCypressErrors = {
  CANNOT_TRASH_ASSETS: (arg1: Error) => {
    return errTemplate`\
        Warning: We failed to trash the existing run results.

        This error will not alter the exit code.

        ${fmt.stackTrace(arg1)}`
  },
  CANNOT_REMOVE_OLD_BROWSER_PROFILES: (arg1: Error) => {
    return errTemplate`\
        Warning: We failed to remove old browser profiles from previous runs.

        This error will not alter the exit code.

        ${fmt.stackTrace(arg1)}`
  },
  VIDEO_RECORDING_FAILED: (arg1: Error) => {
    return errTemplate`\
        Warning: We failed to record the video.

        This error will not alter the exit code.

        ${fmt.stackTrace(arg1)}`
  },
  VIDEO_POST_PROCESSING_FAILED: (arg1: Error) => {
    return errTemplate`\
        Warning: We failed processing this video.

        This error will not alter the exit code.

        ${fmt.stackTrace(arg1)}`
  },
  CHROME_WEB_SECURITY_NOT_SUPPORTED: (browser: string) => {
    return errTemplate`\
        Your project has set the configuration option: ${fmt.highlight(`chromeWebSecurity`)} to ${fmt.highlightTertiary(`false`)}

        This option will not have an effect in ${fmt.off(_.capitalize(browser))}. Tests that rely on web security being disabled will not run as expected.`
  },
  BROWSER_NOT_FOUND_BY_NAME: (browser: string, foundBrowsersStr: string[]) => {
    let canarySuffix: PartialErr | null = null

    if (browser === 'canary') {
      canarySuffix = errPartial`\
          ${fmt.off('\n\n')}
          Note: In ${fmt.cypressVersion(`4.0.0`)}, Canary must be launched as ${fmt.highlightSecondary(`chrome:canary`)}, not ${fmt.highlightSecondary(`canary`)}.

          See https://on.cypress.io/migration-guide for more information on breaking changes in 4.0.0.`
    }

    return errTemplate`\
        Can't run because you've entered an invalid browser name.

        Browser: ${fmt.highlight(browser)} was not found on your system or is not supported by Cypress.

        Cypress supports the following browsers:
        ${fmt.listItems(['electron', 'chrome', 'chromium', 'chrome:canary', 'edge', 'firefox'])}

        You can also use a custom browser: https://on.cypress.io/customize-browsers

        Available browsers found on your system are:
        ${fmt.listItems(foundBrowsersStr)}${canarySuffix}`
  },
  BROWSER_NOT_FOUND_BY_PATH: (arg1: string, arg2: string) => {
    return errTemplate`\
        We could not identify a known browser at the path you provided: ${fmt.path(arg1)}

        The output from the command we ran was:

        ${fmt.highlightSecondary(arg2)}`
  },
  NOT_LOGGED_IN: () => {
    return errTemplate`\
        You're not logged in.

        Run ${fmt.highlight(`cypress open`)} to open the Desktop App and log in.`
  },
  TESTS_DID_NOT_START_RETRYING: (arg1: string) => {
    return errTemplate`Timed out waiting for the browser to connect. ${fmt.off(arg1)}`
  },
  TESTS_DID_NOT_START_FAILED: () => {
    return errTemplate`The browser never connected. Something is wrong. The tests cannot run. Aborting...`
  },
  DASHBOARD_CANCEL_SKIPPED_SPEC: () => {
    return errTemplate`${fmt.off(`\n  `)}This spec and its tests were skipped because the run has been canceled.`
  },
  DASHBOARD_API_RESPONSE_FAILED_RETRYING: (arg1: {tries: number, delay: number, response: Error}) => {
    const time = pluralize('time', arg1.tries)
    const delay = humanTime.long(arg1.delay, false)

    return errTemplate`\
        We encountered an unexpected error talking to our servers.

        We will retry ${fmt.off(arg1.tries)} more ${fmt.off(time)} in ${fmt.off(delay)}...

        The server's response was:

        ${fmt.highlightSecondary(arg1.response)}`
    /* Because of fmt.listFlags() and fmt.listItems() */
    /* eslint-disable indent */
  },
  DASHBOARD_CANNOT_PROCEED_IN_PARALLEL: (arg1: {flags: any, response: Error}) => {
    return errTemplate`\
        We encountered an unexpected error talking to our servers.

        Because you passed the ${fmt.flag(`--parallel`)} flag, this run cannot proceed because it requires a valid response from our servers.

        ${fmt.listFlags(arg1.flags, {
      group: '--group',
      ciBuildId: '--ciBuildId',
    })}

        The server's response was:

        ${fmt.highlightSecondary(arg1.response)}`
  },
  DASHBOARD_CANNOT_PROCEED_IN_SERIAL: (arg1: {flags: any, response: Error}) => {
    return errTemplate`\
        We encountered an unexpected error talking to our servers.

        ${fmt.listFlags(arg1.flags, {
      group: '--group',
      ciBuildId: '--ciBuildId',
    })}

        The server's response was:

        ${fmt.highlightSecondary(arg1.response)}`
  },
  DASHBOARD_UNKNOWN_INVALID_REQUEST: (arg1: {flags: any, response: Error}) => {
    return errTemplate`\
        We encountered an unexpected error talking to our servers.

        There is likely something wrong with the request.

        ${fmt.listFlags(arg1.flags, {
      tags: '--tag',
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        The server's response was:

        ${fmt.highlightSecondary(arg1.response)}`
  },
  DASHBOARD_UNKNOWN_CREATE_RUN_WARNING: (arg1: {props: any, message: string}) => {
    return errTemplate`\
        Warning from Cypress Dashboard: ${fmt.highlight(arg1.message)}

        Details:
        ${fmt.meta(arg1.props)}`
  },
  DASHBOARD_STALE_RUN: (arg1: {runUrl: string, [key: string]: any}) => {
    return errTemplate`\
        You are attempting to pass the ${fmt.flag(`--parallel`)} flag to a run that was completed over 24 hours ago.

        The existing run is: ${fmt.url(arg1.runUrl)}

        You cannot parallelize a run that has been complete for that long.

        ${fmt.listFlags(arg1, {
      tags: '--tag',
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        https://on.cypress.io/stale-run`
  },
  DASHBOARD_ALREADY_COMPLETE: (props: {runUrl: string}) => {
    return errTemplate`\
        The run you are attempting to access is already complete and will not accept new groups.

        The existing run is: ${fmt.url(props.runUrl)}

        When a run finishes all of its groups, it waits for a configurable set of time before finally completing. You must add more groups during that time period.

        ${fmt.listFlags(props, {
      tags: '--tag',
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        https://on.cypress.io/already-complete`
  },
  DASHBOARD_PARALLEL_REQUIRED: (arg1: {runUrl: string}) => {
    return errTemplate`\
        You did not pass the ${fmt.flag(`--parallel`)} flag, but this run's group was originally created with the --parallel flag.

        The existing run is: ${fmt.url(arg1.runUrl)}

        ${fmt.listFlags(arg1, {
      tags: '--tag',
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        You must use the --parallel flag with this group.

        https://on.cypress.io/parallel-required`
  },
  DASHBOARD_PARALLEL_DISALLOWED: (arg1: {runUrl: string}) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--parallel`)} flag, but this run group was originally created without the --parallel flag.

        The existing run is: ${fmt.url(arg1.runUrl)}

        ${fmt.listFlags(arg1, {
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        You can not use the --parallel flag with this group.

        https://on.cypress.io/parallel-disallowed`
  },
  DASHBOARD_PARALLEL_GROUP_PARAMS_MISMATCH: (arg1: {runUrl: string, parameters: any}) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--parallel`)} flag, but we do not parallelize tests across different environments.

        This machine is sending different environment parameters than the first machine that started this parallel run.

        The existing run is: ${fmt.url(arg1.runUrl)}

        In order to run in parallel mode each machine must send identical environment parameters such as:

        ${fmt.listItems([
      'specs',
      'osName',
      'osVersion',
      'browserName',
      'browserVersion (major)',
    ])}

        This machine sent the following parameters:

        ${fmt.meta(arg1.parameters)}

        https://on.cypress.io/parallel-group-params-mismatch`
  },
  DASHBOARD_RUN_GROUP_NAME_NOT_UNIQUE: (arg1: {runUrl: string, ciBuildId?: string | null}) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--group`)} flag, but this group name has already been used for this run.

        The existing run is: ${fmt.url(arg1.runUrl)}

        ${fmt.listFlags(arg1, {
      group: '--group',
      parallel: '--parallel',
      ciBuildId: '--ciBuildId',
    })}

        If you are trying to parallelize this run, then also pass the ${fmt.flag(`--parallel`)} flag, else pass a different group name.

        ${warnIfExplicitCiBuildId(arg1.ciBuildId)}

        https://on.cypress.io/run-group-name-not-unique`
  },
  DEPRECATED_BEFORE_BROWSER_LAUNCH_ARGS: () => {
    return errTemplate`\
      Deprecation Warning: The ${fmt.highlight(`before:browser:launch`)} plugin event changed its signature in ${fmt.cypressVersion(`4.0.0`)}

      The event switched from yielding the second argument as an ${fmt.highlightSecondary(`array`)} of browser arguments to an options ${fmt.highlightSecondary(`object`)} with an ${fmt.highlightSecondary(`args`)} property.

      We've detected that your code is still using the previous, deprecated interface signature.

      This code will not work in a future version of Cypress. Please see the upgrade guide: https://on.cypress.io/deprecated-before-browser-launch-args`
  },
  DUPLICATE_TASK_KEY: (arg1: string[]) => {
    return errTemplate`\
      Warning: Multiple attempts to register the following task(s):

      ${fmt.listItems(arg1, { color: 'yellow' })}

      Only the last attempt will be registered.`
  },
  INDETERMINATE_CI_BUILD_ID: (arg1: Record<string, string>, arg2: string[]) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--group`)} or ${fmt.flag(`--parallel`)} flag but we could not automatically determine or generate a ciBuildId.

        ${fmt.listFlags(arg1, {
      group: '--group',
      parallel: '--parallel',
    })}

        In order to use either of these features a ciBuildId must be determined.

        The ciBuildId is automatically detected if you are running Cypress in any of the these CI providers:

        ${fmt.listItems(arg2)}

        Because the ciBuildId could not be auto-detected you must pass the --ci-build-id flag manually.

        https://on.cypress.io/indeterminate-ci-build-id`
  },
  RECORD_PARAMS_WITHOUT_RECORDING: (arg1: Record<string, string>) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--ci-build-id`)}, ${fmt.flag(`--group`)}, ${fmt.flag(`--tag`)}, or ${fmt.flag(`--parallel`)} flag without also passing the ${fmt.flag(`--record`)} flag.

        ${fmt.listFlags(arg1, {
      ciBuildId: '--ci-build-id',
      tags: '--tag',
      group: '--group',
      parallel: '--parallel',
    })}

        These flags can only be used when recording to the Cypress Dashboard service.

        https://on.cypress.io/record-params-without-recording`
  },
  INCORRECT_CI_BUILD_ID_USAGE: (arg1: Record<string, string>) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--ci-build-id`)} flag but did not provide either a ${fmt.flag(`--group`)} or ${fmt.flag(`--parallel`)} flag.

        ${fmt.listFlags(arg1, {
      ciBuildId: '--ci-build-id',
    })}

        The --ci-build-id flag is used to either group or parallelize multiple runs together.

        https://on.cypress.io/incorrect-ci-build-id-usage`
    /* eslint-enable indent */
  },
  RECORD_KEY_MISSING: () => {
    return errTemplate`\
        You passed the ${fmt.flag(`--record`)} flag but did not provide us your Record Key.

        You can pass us your Record Key like this:

          ${fmt.terminal(`cypress run --record --key <record_key>`)}

        You can also set the key as an environment variable with the name: ${fmt.highlightSecondary(`CYPRESS_RECORD_KEY`)}

        https://on.cypress.io/how-do-i-record-runs`
  },
  // TODO: make this relative path, not absolute
  CANNOT_RECORD_NO_PROJECT_ID: (configFilePath: string) => {
    return errTemplate`\
        You passed the ${fmt.flag(`--record`)} flag but this project has not been setup to record.

        This project is missing the ${fmt.highlight(`projectId`)} inside of: ${fmt.path(configFilePath)}

        We cannot uniquely identify this project without this id.

        You need to setup this project to record. This will generate a unique projectId.

        Alternatively if you omit the ${fmt.flag(`--record`)} flag this project will run without recording.

        https://on.cypress.io/recording-project-runs`
  },
  PROJECT_ID_AND_KEY_BUT_MISSING_RECORD_OPTION: (arg1: string) => {
    return errTemplate`\
        This project has been configured to record runs on our Dashboard.

        It currently has the projectId: ${fmt.highlight(arg1)}

        You also provided your Record Key, but you did not pass the ${fmt.flag(`--record`)} flag.

        This run will not be recorded.

        If you meant to have this run recorded please additionally pass this flag:

          ${fmt.terminal('cypress run --record')}

        If you don't want to record these runs, you can silence this warning:

          ${fmt.terminal('cypress run --record false')}

        https://on.cypress.io/recording-project-runs`
  },
  DASHBOARD_INVALID_RUN_REQUEST: (arg1: {message: string, errors: string[], object: object}) => {
    return errTemplate`\
        Recording this run failed because the request was invalid.

        ${fmt.highlight(arg1.message)}

        Errors:

        ${fmt.meta(arg1.errors)}

        Request Sent:

        ${fmt.meta(arg1.object)}`
  },
  RECORDING_FROM_FORK_PR: () => {
    return errTemplate`\
        Warning: It looks like you are trying to record this run from a forked PR.

        The ${fmt.highlight(`Record Key`)} is missing. Your CI provider is likely not passing private environment variables to builds from forks.

        These results will not be recorded.

        This error will not alter the exit code.`
  },
  DASHBOARD_CANNOT_UPLOAD_RESULTS: (apiErr: Error) => {
    return errTemplate`\
        Warning: We encountered an error while uploading results from your run.

        These results will not be recorded.

        This error will not alter the exit code.

        ${fmt.highlightSecondary(apiErr)}`
  },
  DASHBOARD_CANNOT_CREATE_RUN_OR_INSTANCE: (apiErr: Error) => {
    return errTemplate`\
        Warning: We encountered an error talking to our servers.

        This run will not be recorded.

        This error will not alter the exit code.

        ${fmt.highlightSecondary(apiErr)}`
  },
  DASHBOARD_RECORD_KEY_NOT_VALID: (recordKey: string, projectId: string) => {
    return errTemplate`\
        Your Record Key ${fmt.highlight(recordKey)} is not valid with this projectId: ${fmt.highlightSecondary(projectId)}

        It may have been recently revoked by you or another user.

        Please log into the Dashboard to see the valid record keys.

        https://on.cypress.io/dashboard/projects/${fmt.off(projectId)}`
  },
  DASHBOARD_PROJECT_NOT_FOUND: (projectId: string, configFileBaseName: string) => {
    return errTemplate`\
        We could not find a Dashboard project with the projectId: ${fmt.highlight(projectId)}

        This ${fmt.highlightSecondary(`projectId`)} came from your ${fmt.path(configFileBaseName)} file or an environment variable.

        Please log into the Dashboard and find your project.

        We will list the correct projectId in the 'Settings' tab.

        Alternatively, you can create a new project using the Desktop Application.

        https://on.cypress.io/dashboard`
  },
  // TODO: make this relative path, not absolute
  NO_PROJECT_ID: (configFilePath: string | false) => {
    return errTemplate`Can't find ${fmt.highlight(`projectId`)} in the config file: ${fmt.path(configFilePath || '')}`
  },
  NO_PROJECT_FOUND_AT_PROJECT_ROOT: (projectRoot: string) => {
    return errTemplate`Can't find a project at the path: ${fmt.path(projectRoot)}`
  },
  CANNOT_FETCH_PROJECT_TOKEN: () => {
    return errTemplate`Can't find project's secret key.`
  },
  CANNOT_CREATE_PROJECT_TOKEN: () => {
    return errTemplate`Can't create project's secret key.`
  },
  PORT_IN_USE_SHORT: (arg1: string | number) => {
    return errTemplate`Port ${fmt.highlight(arg1)} is already in use.`
  },
  PORT_IN_USE_LONG: (arg1: string | number) => {
    return errTemplate`\
      Can't run project because port is currently in use: ${fmt.highlight(arg1)}

      Assign a different port with the ${fmt.flag(`--port <port>`)} argument or shut down the other running process.`
  },
  ERROR_READING_FILE: (filePath: string, err: Error) => {
    return errTemplate`\
        Error reading from: ${fmt.path(filePath)}

        ${fmt.stackTrace(err)}`
  },
  ERROR_WRITING_FILE: (filePath: string, err: Error) => {
    return errTemplate`\
        Error writing to: ${fmt.path(filePath)}

        ${fmt.stackTrace(err)}`
  },
  NO_SPECS_FOUND: (folderPath: string, globPattern?: string[] | string | null) => {
    // no glob provided, searched all specs
    if (!globPattern) {
      return errTemplate`\
          Can't run because ${fmt.highlightSecondary(`no spec files`)} were found.

          We searched for specs inside of this folder:

          ${fmt.listItem(folderPath)}`
    }

    const globPaths = _.castArray(globPattern).map((pattern) => {
      const [resolvedBasePath, resolvedPattern] = parseResolvedPattern(folderPath, pattern)

      return path.join(resolvedBasePath!, theme.yellow(resolvedPattern!))
    })

    const phrase = globPaths.length > 1 ? 'these glob patterns' : 'this glob pattern'

    return errTemplate`\
        Can't run because ${fmt.highlightSecondary(`no spec files`)} were found.

        We searched for specs matching ${fmt.off(phrase)}:

        ${fmt.listItems(globPaths, { color: 'blue', prefix: '  > ' })}`
  },
  RENDERER_CRASHED: () => {
    return errTemplate`\
        We detected that the Chromium Renderer process just crashed.

        This is the equivalent to seeing the 'sad face' when Chrome dies.

        This can happen for a number of different reasons:

        - You wrote an endless loop and you must fix your own code
        - There is a memory leak in Cypress (unlikely but possible)
        - You are running Docker (there is an easy fix for this: see link below)
        - You are running lots of tests on a memory intense application
        - You are running in a memory starved VM environment
        - There are problems with your GPU / GPU drivers
        - There are browser bugs in Chromium

        You can learn more including how to fix Docker here:

        https://on.cypress.io/renderer-process-crashed`
  },
  AUTOMATION_SERVER_DISCONNECTED: () => {
    return errTemplate`The automation client disconnected. Cannot continue running tests.`
  },
  // TODO: make this relative path, not absolute
  SUPPORT_FILE_NOT_FOUND: (supportFilePath: string) => {
    return errTemplate`\
        Your ${fmt.highlight(`supportFile`)} is missing or invalid: ${fmt.path(supportFilePath)}

        The supportFile must be a .js, .ts, .coffee file or be supported by your preprocessor plugin (if configured).

        Fix your support file, or set supportFile to ${fmt.highlightSecondary(`false`)} if a support file is not necessary for your project.

        If you have just renamed the extension of your supportFile, restart Cypress.

        https://on.cypress.io/support-file-missing-or-invalid`
  },
  // TODO: make this relative path, not absolute
  PLUGINS_FILE_ERROR: (pluginsFilePath: string, err: Error) => {
    return errTemplate`\
        Your ${fmt.highlight(`pluginsFile`)} is invalid: ${fmt.path(pluginsFilePath)}

        It threw an error when required, check the stack trace below:

        ${fmt.stackTrace(err)}
      `
  },
  // TODO: make this relative path, not absolute
  PLUGINS_FILE_NOT_FOUND: (pluginsFilePath: string) => {
    return errTemplate`\
        Your ${fmt.highlight(`pluginsFile`)} was not found at path: ${fmt.path(pluginsFilePath)}

        Create this file, or set pluginsFile to ${fmt.highlightSecondary(`false`)} if a plugins file is not necessary for your project.

        If you have just renamed the extension of your pluginsFile, restart Cypress.
      `
  },
  // TODO: make this relative path, not absolute
  PLUGINS_DIDNT_EXPORT_FUNCTION: (pluginsFilePath: string, exported: any) => {
    const code = errPartial`
      module.exports = (on, config) => {
        ${fmt.comment(`// configure plugins here`)}
      }`

    return errTemplate`\
      Your ${fmt.highlight(`pluginsFile`)} did not export a valid function from: ${fmt.path(pluginsFilePath)}

      It must export a function with the following signature:

      ${fmt.code(code)}

      Instead it exported:

      ${fmt.stringify(exported)}

      https://on.cypress.io/plugins-api
    `
  },
  // TODO: make this relative path, not absolute
  PLUGINS_FUNCTION_ERROR: (pluginsFilePath: string, err: Error) => {
    return errTemplate`\
      Your ${fmt.highlight(`pluginsFile`)} threw an error from: ${fmt.path(pluginsFilePath)}

      ${fmt.stackTrace(err)}`
  },
  PLUGINS_UNEXPECTED_ERROR: (arg1: string, arg2: string | Error) => {
    return errTemplate`
      We stopped running your tests because a plugin crashed.

      Your ${fmt.highlight(`pluginsFile`)} threw an error from: ${fmt.path(arg1)}

      ${fmt.stackTrace(arg2)}
    `
  },
  // TODO: make this relative path, not absolute
  PLUGINS_INVALID_EVENT_NAME_ERROR: (pluginsFilePath: string, invalidEventName: string, validEventNames: string[], err: Error) => {
    return errTemplate`
      Your ${fmt.highlightSecondary(`pluginsFile`)} threw a validation error: ${fmt.path(pluginsFilePath)}

      You must pass a valid event name when registering a plugin.

      You passed: ${fmt.highlight(invalidEventName)}

      The following are valid events:

      ${fmt.listItems(validEventNames)}

      ${fmt.stackTrace(err)}
    `
  },
  BUNDLE_ERROR: (filePath: string, arg2: string) => {
    // IF YOU MODIFY THIS MAKE SURE TO UPDATE
    // THE ERROR MESSAGE IN THE RUNNER TOO
    return errTemplate`\
      Oops...we found an error preparing this test file:

      ${fmt.listItem(filePath)}

      The error was:

      ${fmt.highlight(arg2)}

      This occurred while Cypress was compiling and bundling your test code. This is usually caused by:

      - A missing file or dependency
      - A syntax error in the file or one of its dependencies

      Fix the error in your code and re-run your tests.`
  },
  // happens when there is an error in configuration file like "cypress.json"
  // TODO: make this relative path, not absolute
  CONFIG_VALIDATION_MSG_ERROR: (fileType: 'configFile' | 'pluginsFile' | null, fileName: string | null, validationMsg: string) => {
    if (!fileType) {
      return errTemplate`
        An invalid configuration value was set:

        ${fmt.highlight(validationMsg)}`
    }

    return errTemplate`
      Your ${fmt.highlight(fileType)} set an invalid value from: ${fmt.path(fileName)}

      ${fmt.highlight(validationMsg)}`
  },
  // TODO: make this relative path, not absolute
  CONFIG_VALIDATION_ERROR: (fileType: 'configFile' | 'pluginsFile' | null, filePath: string | null, validationResult: ConfigValidationError) => {
    const { key, type, value, list } = validationResult

    if (!fileType) {
      return errTemplate`\
        An invalid configuration value was set.

        Expected ${fmt.highlight(key)} to be ${fmt.off(type)}.

        Instead the value was: ${fmt.stringify(value)}`
    }

    if (list) {
      return errTemplate`\
        Your ${fmt.highlight(fileType)} set an invalid value from: ${fmt.path(filePath)}

        The error occurred while validating the ${fmt.highlightSecondary(list)} list.

        Expected ${fmt.highlight(key)} to be ${fmt.off(type)}.

        Instead the value was: ${fmt.stringify(value)}`
    }

    return errTemplate`\
      Your ${fmt.highlight(fileType)} set an invalid value from: ${fmt.path(filePath)}

      Expected ${fmt.highlight(key)} to be ${fmt.off(type)}.

      Instead the value was: ${fmt.stringify(value)}`
  },
  RENAMED_CONFIG_OPTION: (arg1: {name: string, newName: string}) => {
    return errTemplate`\
        The ${fmt.highlight(arg1.name)} configuration option you have supplied has been renamed.

        Please rename ${fmt.highlight(arg1.name)} to ${fmt.highlightSecondary(arg1.newName)}`
  },
  CANNOT_CONNECT_BASE_URL: () => {
    return errTemplate`\
        Cypress failed to verify that your server is running.

        Please start this server and then run Cypress again.`
  },
  CANNOT_CONNECT_BASE_URL_WARNING: (arg1: string) => {
    return errTemplate`\
        Cypress could not verify that this server is running:

        ${fmt.listItem(arg1)}

        This server has been configured as your ${fmt.highlight(`baseUrl`)}, and tests will likely fail if it is not running.`
  },
  // TODO: test this
  CANNOT_CONNECT_BASE_URL_RETRYING: (arg1: {attempt: number, baseUrl: string, remaining: number, delay: number}) => {
    switch (arg1.attempt) {
      case 1:
        return errTemplate`\
            Cypress could not verify that this server is running:

            ${fmt.listItem(arg1.baseUrl)}

            We are verifying this server because it has been configured as your ${fmt.highlight(`baseUrl`)}.

            Cypress automatically waits until your server is accessible before running tests.

            ${displayRetriesRemaining(arg1.remaining)}`
      default:
        return errTemplate`${displayRetriesRemaining(arg1.remaining)}`
    }
  },
  // TODO: test this
  INVALID_REPORTER_NAME: (arg1: {name: string, paths: string[], error: Error}) => {
    return errTemplate`\
        Error loading the reporter: ${fmt.highlight(arg1.name)}

        We searched for the reporter in these paths:

        ${fmt.listItems(arg1.paths)}

        Learn more at https://on.cypress.io/reporters

        ${fmt.stackTrace(arg1.error)}
        `
  },
  // TODO: manually test this
  NO_DEFAULT_CONFIG_FILE_FOUND: (arg1: string) => {
    return errTemplate`\
        Could not find a Cypress configuration file in this folder: ${fmt.path(arg1)}`
  },
  // TODO: verify these are configBaseName and not configPath
  CONFIG_FILES_LANGUAGE_CONFLICT: (projectRoot: string, configFileBaseName1: string, configFileBaseName2: string) => {
    return errTemplate`
          There is both a ${fmt.highlight(configFileBaseName1)} and a ${fmt.highlight(configFileBaseName2)} at the location below:

          ${fmt.listItem(projectRoot)}

          Cypress does not know which one to read for config. Please remove one of the two and try again.
          `
  },
  CONFIG_FILE_NOT_FOUND: (configFileBaseName: string, projectRoot: string) => {
    return errTemplate`\
        Could not find a Cypress configuration file.

        We looked but did not find a ${fmt.highlight(configFileBaseName)} file in this folder: ${fmt.path(projectRoot)}`
  },
  INVOKED_BINARY_OUTSIDE_NPM_MODULE: () => {
    return errTemplate`\
        It looks like you are running the Cypress binary directly.

        This is not the recommended approach, and Cypress may not work correctly.

        Please install the ${fmt.highlight(`cypress`)} NPM package and follow the instructions here:

        https://on.cypress.io/installing-cypress`
  },
  FREE_PLAN_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1: {link: string, usedTestsMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of private test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue recording tests this month you must upgrade your account. Please visit your billing to upgrade to another billing plan.

        ${fmt.off(arg1.link)}`
  },
  FREE_PLAN_IN_GRACE_PERIOD_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1: {link: string, usedTestsMessage: string, gracePeriodMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of private test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        Your plan is now in a grace period, which means your tests will still be recorded until ${fmt.off(arg1.gracePeriodMessage)}. Please upgrade your plan to continue recording tests on the Cypress Dashboard in the future.

        ${fmt.off(arg1.link)}`
  },
  PAID_PLAN_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1: {link: string, usedTestsMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of private test results under your current billing plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To upgrade your account, please visit your billing to upgrade to another billing plan.

        ${fmt.off(arg1.link)}`
  },
  FREE_PLAN_EXCEEDS_MONTHLY_TESTS: (arg1: {link: string, usedTestsMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue recording tests this month you must upgrade your account. Please visit your billing to upgrade to another billing plan.

        ${fmt.off(arg1.link)}`
  },
  FREE_PLAN_IN_GRACE_PERIOD_EXCEEDS_MONTHLY_TESTS: (arg1: {link: string, usedTestsMessage: string, gracePeriodMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        Your plan is now in a grace period, which means you will have the full benefits of your current plan until ${fmt.highlight(arg1.gracePeriodMessage)}.

        Please visit your billing to upgrade your plan.

        ${fmt.off(arg1.link)}`
  },
  PLAN_EXCEEDS_MONTHLY_TESTS: (arg1: {link: string, planType: string, usedTestsMessage: string, limit: number}) => {
    return errTemplate`\
        You've exceeded the limit of test results under your ${fmt.highlight(arg1.planType)} billing plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue getting the full benefits of your current plan, please visit your billing to upgrade.

        ${fmt.off(arg1.link)}`
  },
  FREE_PLAN_IN_GRACE_PERIOD_PARALLEL_FEATURE: (arg1: {link: string, gracePeriodMessage: string}) => {
    return errTemplate`\
        ${fmt.highlightSecondary(`Parallelization`)} is not included under your free plan.

        Your plan is now in a grace period, which means your tests will still run in parallel until ${fmt.highlight(arg1.gracePeriodMessage)}. Please upgrade your plan to continue running your tests in parallel in the future.

        ${fmt.off(arg1.link)}`
  },
  PARALLEL_FEATURE_NOT_AVAILABLE_IN_PLAN: (arg1: {link: string}) => {
    return errTemplate`\
        ${fmt.highlightSecondary(`Parallelization`)} is not included under your current billing plan.

        To run your tests in parallel, please visit your billing and upgrade to another plan with parallelization.

        ${fmt.off(arg1.link)}`
  },
  PLAN_IN_GRACE_PERIOD_RUN_GROUPING_FEATURE_USED: (arg1: {link: string, gracePeriodMessage: string}) => {
    return errTemplate`\
        ${fmt.highlightSecondary(`Grouping`)} is not included under your free plan.

        Your plan is now in a grace period, which means your tests will still run with groups until ${fmt.highlight(arg1.gracePeriodMessage)}. Please upgrade your plan to continue running your tests with groups in the future.

        ${fmt.off(arg1.link)}`
  },
  RUN_GROUPING_FEATURE_NOT_AVAILABLE_IN_PLAN: (arg1: {link: string}) => {
    return errTemplate`\
        ${fmt.highlightSecondary(`Grouping`)} is not included under your current billing plan.

        To run your tests with groups, please visit your billing and upgrade to another plan with grouping.

        ${fmt.off(arg1.link)}`
  },
  // TODO: fix
  FIXTURE_NOT_FOUND: (arg1: string, arg2: string[]) => {
    return errTemplate`\
        A fixture file could not be found at any of the following paths:

          ${fmt.listItem(arg1)}
          ${fmt.listItem(arg1)}.[ext]

        Cypress looked for these file extensions at the provided path:

          ${fmt.listItem(arg2.join(', '))}

        Provide a path to an existing fixture file.`
  },
  // TODO: test this
  AUTH_COULD_NOT_LAUNCH_BROWSER: (loginUrl: string) => {
    return errTemplate`\
      Cypress was unable to open your installed browser. To continue logging in, please open this URL in your web browser:

      ${fmt.url(loginUrl)}`
  },
  AUTH_BROWSER_LAUNCHED: () => {
    return errTemplate`Check your browser to continue logging in.`
  },
  BAD_POLICY_WARNING: (policyKeys: string[]) => {
    return errTemplate`\
        Cypress detected policy settings on your computer that may cause issues.

        The following policies were detected that may prevent Cypress from automating Chrome:

        ${fmt.listItems(policyKeys)}

        For more information, see https://on.cypress.io/bad-browser-policy`
  },
  BAD_POLICY_WARNING_TOOLTIP: () => {
    return errTemplate`Cypress detected policy settings on your computer that may cause issues with using this browser. For more information, see https://on.cypress.io/bad-browser-policy`
  },
  EXTENSION_NOT_LOADED: (browserName: string, extensionPath: string) => {
    return errTemplate`\
        ${fmt.off(browserName)} could not install the extension at path: ${fmt.path(extensionPath)}

        Please verify that this is the path to a valid, unpacked WebExtension.`
  },
  COULD_NOT_FIND_SYSTEM_NODE: (nodeVersion: string) => {
    return errTemplate`\
        ${fmt.highlight(`nodeVersion`)} is set to ${fmt.highlightTertiary(`system`)} but Cypress could not find a usable Node executable on your ${fmt.highlightSecondary(`PATH`)}.

        Make sure that your Node executable exists and can be run by the current user.

        Cypress will use the built-in Node version ${fmt.highlightSecondary(nodeVersion)} instead.`
  },
  INVALID_CYPRESS_INTERNAL_ENV: (val: string) => {
    return errTemplate`\
        We have detected an unknown or unsupported ${fmt.highlightSecondary(`CYPRESS_INTERNAL_ENV`)} value: ${fmt.highlight(val)}

        CYPRESS_INTERNAL_ENV is reserved for internal use and cannot be modified.`
  },
  CDP_VERSION_TOO_OLD: (minimumVersion: string, currentVersion: {major: number, minor: string | number}) => {
    const phrase = currentVersion.major !== 0
      ? fmt.highlight(`${currentVersion.major}.${currentVersion.minor}`)
      : fmt.off('an older version')

    return errTemplate`A minimum CDP version of ${fmt.highlight(minimumVersion)} is required, but the current browser has ${phrase}.`
  },
  CDP_COULD_NOT_CONNECT: (browserName: string, port: number, err: Error) => {
    // we include a stack trace here because it may contain useful information
    // to debug since this is an "uncontrolled" error even though it doesn't
    // come from a user
    return errTemplate`\
        Cypress failed to make a connection to the Chrome DevTools Protocol after retrying for 50 seconds.

        This usually indicates there was a problem opening the ${fmt.off(_.capitalize(browserName))} browser.

        The CDP port requested was ${fmt.highlight(port)}.

        ${fmt.stackTrace(err)}`
  },
  FIREFOX_COULD_NOT_CONNECT: (arg1: Error) => {
    // we include a stack trace here because it may contain useful information
    // to debug since this is an "uncontrolled" error even though it doesn't
    // come from a user
    return errTemplate`\
        Cypress failed to make a connection to Firefox.

        This usually indicates there was a problem opening the Firefox browser.

        ${fmt.stackTrace(arg1)}`
  },
  CDP_COULD_NOT_RECONNECT: (arg1: Error) => {
    return errTemplate`\
        There was an error reconnecting to the Chrome DevTools protocol. Please restart the browser.

        ${fmt.stackTrace(arg1)}`
  },
  CDP_RETRYING_CONNECTION: (attempt: string | number, browserName: string) => {
    return errTemplate`Still waiting to connect to ${fmt.off(_.capitalize(browserName))}, retrying in 1 second ${fmt.meta(`(attempt ${attempt}/62)`)}`
  },
  UNEXPECTED_BEFORE_BROWSER_LAUNCH_PROPERTIES: (arg1: string[], arg2: string[]) => {
    return errTemplate`\
        The ${fmt.highlight('launchOptions')} object returned by your plugin's ${fmt.highlightSecondary(`before:browser:launch`)} handler contained unexpected properties:

        ${fmt.listItems(arg1)}

        launchOptions may only contain the properties:

        ${fmt.listItems(arg2)}

        https://on.cypress.io/browser-launch-api`
  },
  // TODO: test this
  COULD_NOT_PARSE_ARGUMENTS: (argName: string, argValue: string, errMsg: string) => {
    return errTemplate`\
        Cypress encountered an error while parsing the argument: ${fmt.highlight(`--${argName}`)}

        You passed: ${fmt.highlightTertiary(argValue)}

        The error was: ${fmt.highlightSecondary(errMsg)}`
  },
  FIREFOX_MARIONETTE_FAILURE: (origin: string, err: Error) => {
    return errTemplate`\
        Cypress could not connect to Firefox.

        An unexpected error was received from Marionette: ${fmt.highlightSecondary(origin)}

        To avoid this error, ensure that there are no other instances of Firefox launched by Cypress running.

        ${fmt.stackTrace(err)}`
  },
  FOLDER_NOT_WRITABLE: (arg1: string) => {
    return errTemplate`\
        This folder is not writable: ${fmt.path(arg1)}

        Writing to this directory is required by Cypress in order to store screenshots and videos.

        Enable write permissions to this directory to ensure screenshots and videos are stored.

        If you don't require screenshots or videos to be stored you can safely ignore this warning.`
  },
  EXPERIMENTAL_SAMESITE_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`experimentalGetCookiesSameSite`)} configuration option was removed in ${fmt.cypressVersion(`5.0.0`)}.

        Returning the ${fmt.highlightSecondary(`sameSite`)} property is now the default behavior of the ${fmt.highlightSecondary(`cy.cookie`)} commands.

        You can safely remove this option from your config.`
  },
  // TODO: verify configFile is absolute path
  // TODO: make this relative path, not absolute
  EXPERIMENTAL_COMPONENT_TESTING_REMOVED: (arg1: {configFile: string}) => {
    return errTemplate`\
        The ${fmt.highlight('experimentalComponentTesting')} configuration option was removed in ${fmt.cypressVersion(`7.0.0`)}.

        Please remove this flag from: ${fmt.path(arg1.configFile)}

        Component Testing is now a standalone command. You can now run your component tests with:

          ${fmt.terminal(`cypress open-ct`)}

        https://on.cypress.io/migration-guide`
  },
  EXPERIMENTAL_SESSION_SUPPORT_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`experimentalSessionSupport`)} configuration option was removed in ${fmt.cypressVersion(`9.6.0`)} and replaced with ${fmt.highlight(`experimentalSessionAndOrigin`)}. Please update your config to use ${fmt.highlight(`experimentalSessionAndOrigin`)} instead.
        
        https://on.cypress.io/session`
  },
  EXPERIMENTAL_SHADOW_DOM_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`experimentalShadowDomSupport`)} configuration option was removed in ${fmt.cypressVersion(`5.2.0`)}. It is no longer necessary when utilizing the ${fmt.highlightSecondary(`includeShadowDom`)} option.

        You can safely remove this option from your config.`
  },
  EXPERIMENTAL_NETWORK_STUBBING_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`experimentalNetworkStubbing`)} configuration option was removed in ${fmt.cypressVersion(`6.0.0`)}.

        It is no longer necessary for using ${fmt.highlightSecondary(`cy.intercept()`)}. You can safely remove this option from your config.`
  },
  EXPERIMENTAL_RUN_EVENTS_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`experimentalRunEvents`)} configuration option was removed in ${fmt.cypressVersion(`6.7.0`)}. It is no longer necessary when listening to run events in the plugins file.

        You can safely remove this option from your config.`
  },
  FIREFOX_GC_INTERVAL_REMOVED: () => {
    return errTemplate`\
        The ${fmt.highlight(`firefoxGcInterval`)} configuration option was removed in ${fmt.cypressVersion(`8.0.0`)}. It was introduced to work around a bug in Firefox 79 and below.

        Since Cypress no longer supports Firefox 85 and below in Cypress ${fmt.cypressVersion(`8.0.0`)}, this option was removed.

        You can safely remove this option from your config.`
  },
  // TODO: make this relative path, not absolute
  INCOMPATIBLE_PLUGIN_RETRIES: (arg1: string) => {
    return errTemplate`\
      We've detected that the incompatible plugin ${fmt.highlight(`cypress-plugin-retries`)} is installed at: ${fmt.path(arg1)}

      Test retries is now natively supported in ${fmt.cypressVersion(`5.0.0`)}.

      Remove the plugin from your dependencies to silence this warning.

      https://on.cypress.io/test-retries
      `
  },
  // TODO: test this
  INVALID_CONFIG_OPTION: (arg1: string[]) => {
    const phrase = arg1.length > 1 ? 'options are' : 'option is'

    return errTemplate`\
        The following configuration ${fmt.off(phrase)} invalid:

        ${fmt.listItems(arg1, { color: 'yellow' })}

        https://on.cypress.io/configuration
        `
  },
  PLUGINS_RUN_EVENT_ERROR: (arg1: string, arg2: Error) => {
    return errTemplate`\
        An error was thrown in your plugins file while executing the handler for the ${fmt.highlight(arg1)} event.

        The error we received was:

        ${fmt.stackTrace(arg2)}`
  },
  CT_NO_DEV_START_EVENT: (pluginsFilePath: string) => {
    const code = errPartial`
      ${fmt.comment(`// ${pluginsFilePath}`)}
      module.exports = (on, config) => {
        on('dev-server:start', () => startDevServer(...)
      }`

    return errTemplate`\
        To run component-testing, cypress needs the ${fmt.highlight(`dev-server:start`)} event.

        Please implement it by adding this code to your ${fmt.highlightSecondary(`pluginsFile`)}.

        ${fmt.code(code)}

        See https://on.cypress.io/component-testing for help on setting up component testing.`
  },
  UNSUPPORTED_BROWSER_VERSION: (errorMsg: string) => {
    return errTemplate`${fmt.off(errorMsg)}`
  },
  NODE_VERSION_DEPRECATION_SYSTEM: (arg1: {name: string, value: any, configFile: string}) => {
    return errTemplate`\
      Deprecation Warning: ${fmt.highlight(arg1.name)} is currently set to ${fmt.highlightSecondary(arg1.value)} in the ${fmt.highlightTertiary(arg1.configFile)} configuration file.

      As of ${fmt.cypressVersion(`9.0.0`)} the default behavior of ${fmt.highlight(arg1.name)} has changed to always use the version of Node used to start cypress via the cli.

      Please remove the ${fmt.highlight(arg1.name)} configuration option from ${fmt.highlightTertiary(arg1.configFile)}.
      `
  },
  // TODO: does this need to change since its a warning?
  NODE_VERSION_DEPRECATION_BUNDLED: (arg1: {name: string, value: any, configFile: string}) => {
    return errTemplate`\
      Deprecation Warning: ${fmt.highlight(arg1.name)} is currently set to ${fmt.highlightSecondary(arg1.value)} in the ${fmt.highlightTertiary(arg1.configFile)} configuration file.

      As of ${fmt.cypressVersion(`9.0.0`)} the default behavior of ${fmt.highlight(arg1.name)} has changed to always use the version of Node used to start cypress via the cli.

      When ${fmt.highlight(arg1.name)} is set to ${fmt.highlightSecondary(arg1.value)}, Cypress will use the version of Node bundled with electron. This can cause problems running certain plugins or integrations.

      As the ${fmt.highlight(arg1.name)} configuration option will be removed in a future release, it is recommended to remove the ${fmt.highlight(arg1.name)} configuration option from ${fmt.highlightTertiary(arg1.configFile)}.
      `
  },
} as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheck: Record<keyof AllCypressErrorObj, (...args: any[]) => ErrTemplateResult> = AllCypressErrors

type AllCypressErrorObj = typeof AllCypressErrors

export function getMsgByType<Type extends keyof AllCypressErrorObj> (type: Type, ...args: Parameters<AllCypressErrorObj[Type]>): string {
  const err = getError(type, ...args)

  return err.message
}

/**
 * Given an error name & params for the error, returns a "CypressError",
 * with a forBrowser property, used when we want to format the value for sending to
 * the browser rather than the terminal.
 *
 * @param type
 * @param args
 * @returns
 */
export const getError = function <Type extends keyof AllCypressErrorObj> (type: Type, ...args: Parameters<AllCypressErrorObj[Type]>) {
  // If we don't know this "type" of error, return as a non-cypress error
  if (!AllCypressErrors[type]) {
    const err = new Error(args[1] || type) as ErrorLike

    err.type = type

    return err
  }

  // @ts-expect-error
  const result = AllCypressErrors[type](...args) as ErrTemplateResult

  const { message, details, originalError, messageMarkdown } = result

  const err = new Error(message) as CypressError

  err.isCypressErr = true
  err.type = type
  err.details = details
  err.messageMarkdown = messageMarkdown
  err.originalError = originalError

  if (originalError) {
    err.stack = originalError.stack
    err.stackWithoutMessage = stackWithoutMessage(originalError.stack ?? '')
  } else {
    const newErr = new Error()

    Error.captureStackTrace(newErr, getError)
    err.stack = newErr.stack
    err.stackWithoutMessage = stackWithoutMessage(err.stack ?? '')
  }

  return err
}

export const logWarning = function <Type extends keyof AllCypressErrorObj> (type: Type, ...args: Parameters<AllCypressErrorObj[Type]>) {
  const err = getError(type, ...args)

  logError(err, 'magenta')

  return null
}

export const throwErr = function <Type extends keyof AllCypressErrorObj> (type: Type, ...args: Parameters<AllCypressErrorObj[Type]>) {
  const err = getError(type, ...args)

  if (!err.originalError) {
    Error.captureStackTrace(err, throwErr)
    err.stackWithoutMessage = stackWithoutMessage(err.stack ?? '')
  }

  throw err
}

// For when the error is passed via the socket-base
interface GenericError extends Error {
  forBrowser?: never
  stackWithoutMessage?: never
  [key: string]: any
}

export const cloneError = function (err: CypressError | GenericError, options: {html?: boolean} = {}) {
  _.defaults(options, {
    html: false,
  })

  // pull off these properties
  const obj = _.pick(err, 'message', 'messageMarkdown', 'type', 'name', 'stack', 'fileName', 'lineNumber', 'columnNumber') as ClonedError

  if (options.html) {
    obj.message = ansi_up.ansi_to_html(err.message)
    // revert back the distorted characters
    // in case there is an error in a child_process
    // that contains quotes
    .replace(/\&\#x27;/g, '\'')
    .replace(/\&quot\;/g, '"')
  }

  // and any own (custom) properties
  // of the err object
  Object.entries(err || {}).forEach(([prop, val]) => {
    obj[prop] = val
  })

  if (err.stackWithoutMessage) {
    obj.stack = err.stackWithoutMessage
  }

  return obj
}

export {
  stripAnsi,
  cloneError as clone,
  throwErr as throw,
  getError as get,
  logWarning as warning,
}

// Re-exporting old namespaces for legacy server access
export {
  logError as log,
  isCypressErr,
} from './errorUtils'
