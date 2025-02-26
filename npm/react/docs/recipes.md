# Recipes

- [Recipes](#recipes)
  - [Configuration](#configuration)
    - [Do nothing](#do-nothing)
    - [React Scripts](#react-scripts)
    - [Next.js](#nextjs)
    - [Your Webpack config](#your-webpack-config)
    - [Your `.babelrc` file](#your-babelrc-file)
      - [Add Babel plugins](#add-babel-plugins)
      - [Using rollup config](#using-rollup-config)
  - [Usage](#usage)
    - [Changing props](#changing-props)

## Configuration

### Do nothing

Cypress Test Runner understands plain JSX by default, so for simple React applications it ... might just test components right out of the box!

But usually you want to point Cypress at your application's current Webpack configuration, so the specs can import your components correctly. The next recipes discuss common ways for doing this.

### React Scripts

If you are using Create-React-App v3 or `react-scripts`, and want to reuse the built in Webpack (even after ejecting), this module ships with Cypress preprocessor in [plugins](plugins) folder.

```js
// cypress/plugins/index.js
module.exports = (on, config) => {
  require('@cypress/react/plugins/react-scripts')(on, config)
  // IMPORTANT to return the config object
  // with the any changed environment variables
  return config
}
```

See example repo [bahmutov/try-cra-with-unit-test](https://github.com/bahmutov/try-cra-with-unit-test) or included example in the folder [examples/react-scripts](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/react-scripts).

**Tip:** `plugins/react-scripts` is just loading `plugins/cra-v3`.

### Next.js

```js
// cypress/plugins/index.js
module.exports = (on, config) => {
  require('@cypress/react/plugins/next')(on, config)
  // IMPORTANT to return the config object
  // with the any changed environment variables
  return config
}
```

See example in the folder [examples/nextjs](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/nextjs).

### Your Webpack config

If you have your own Webpack config, you can use included plugins file to load it. You can pass the Webpack config file name (with respect to the root folder where `cypress.json` file sits) via plugins file or via an `env` variable in `cypress.json`

```js
// cypress/plugins/index.js
module.exports = (on, config) => {
  // the path is relative to cypress.json
  const webpackFilename = './src/webpack.config.js'
  
  // configuration
  config.env.webpackFilename = webpackFilename
  config.env.coverage = false
  
  require('@cypress/react/plugins/load-webpack')(on, config, {webpackFilename})
  
  // IMPORTANT to return the config object
  // with the any changed environment variables
  return config
}
```

See example in [bahmutov/Jscrambler-Webpack-React](https://github.com/bahmutov/Jscrambler-Webpack-React) or included example in the folder [examples/webpack-file](https://github.com/cypress-io/cypress/tree/develop/npm/react/https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/webpack-file).

### Your `.babelrc` file

If you are using Babel without Webpack to transpile, you can use the plugin that tells Babel loader to use your `.babelrc` configuration file.

```js
// cypress/plugins/index.js
module.exports = (on, config) => {
  // tell Cypress to bundle specs and components using project's .babelrc file
  require('@cypress/react/plugins/babelrc')(on, config)
  // IMPORTANT to return the config object
  // with the any changed environment variables
  return config
}
```

See example in the folder [examples/using-babel](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/using-babel) and [examples/using-babel-typescript](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/using-babel-typescript).

#### Add Babel plugins

If you want to use code instrumentation, add the [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul) to your `.babelrc` setup. You do not even need to install it separately, as it is already included in `@cypress/react` as a dependency.

If you want to use ES6 import mocking, add the [@babel/plugin-transform-modules-commonjs](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-modules-commonjs) to the list of plugins. This module is also included in `@cypress/react` as a dependency.

```json
{
  "presets": ["@babel/preset-env", "@babel/preset-react"],
  "plugins": [
    "babel-plugin-istanbul",
    [
      "@babel/plugin-transform-modules-commonjs",
      {
        "loose": true
      }
    ]
  ]
}
```

When loading your `.babelrc` settings, `@cypress/react` sets `BABEL_ENV` and `NODE_ENV` to `test` if they are not set already. Thus you can move the above plugins into the `test` environment to exclude them from being used in production bundle.

```json
{
  "presets": ["@babel/preset-env", "@babel/preset-react"],
  "env": {
    "test": {
      "plugins": [
        "babel-plugin-istanbul",
        [
          "@babel/plugin-transform-modules-commonjs",
          {
            "loose": true
          }
        ]
      ]
    }
  }
}
```

See [examples/using-babel](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/using-babel) folder for full example.

#### Using rollup config

If you are using rollup for bundling – we can use it as well for the bundling. Check the example:

```js
// // cypress/plugins/index.js
const rollupPreprocessor = require('@bahmutov/cy-rollup')

module.exports = (on, config) => {
  on(
    'file:preprocessor',
    rollupPreprocessor({
      // this is the default value
      configFile: 'rollup.config.js',
    }),
  )

  require('@cypress/code-coverage/task')(on, config)
}
```

But make sure that several rollup plugins are required in order to bundle the code for cypress.

```js
// bundle node_modules
nodeResolve(),
// process commonjs modules
commonjs(),
// required for react (prop-types) sources
replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
```

See [react/examples/rollup](https://github.com/cypress-io/cypress/tree/develop/npm/react/examples/rollup) folder for full example.

## Usage

### Changing props

Many components have some statefulness, whether explicitly through `useState`, or implicitly through `useEffect`. Therefore during testing it is useful to keep the component mounted, but change the props being passed to it in order to preserve its state. This is referred to in some testing frameworks as `rerender()`.

We recommend building a "wrapper" component that acts similarly to how your users will interact with the component under test. In isolation, you can add DOM controls to push new props to your component.

```js
const Accumulator = ({ value }) => {
  const [storedValues, setStoredValues] = React.useState([])

  React.useEffect(() => {
    if (!value) {
      return
    }

    setStoredValues((prev) => [...prev, value])
  }, [value])

  return (
    <ul>
      {storedValues.map((v) => (
        <li key={v}>
          {v}
        </li>
      ))}
    </ul>
  )
}
```

This component is an accumulator that stores each `value` prop passed to it. We create a wrapper component that has an `input` and a `button` to push new values to the `value` prop.

```js
const TestAcc = () => {
  const ref = React.useRef()
  const [value, setValue] = React.useState()

  return (
    <div>
      <input ref={ref} />
      <button
        onClick={() => {
          setValue(ref.current.value)
        }}
      >
        Add
      </button>
      <Acc value={value} />
    </div>
  )
}
```

With this, we can begin writing component tests to check the functionality of our `Accumulator` component.

```js
it('should store value', () => {
  mount(<TestAcc />)

  cy.get('input').type('Component testing is awesome!')
  cy.get('button').click()

  cy.get('li').eq(0).contains('Component testing is awesome!')

  cy.get('input').clear().type('We are dynamically changing props')
  cy.get('button').click()

  cy.get('li').eq(1).contains('We are dynamically changing props')

  cy.get('input').clear().type('to build a list of text')
  cy.get('button').click()

  cy.get('li').eq(0).contains('Component testing is awesome!')
  cy.get('li').eq(1).contains('We are dynamically changing props')
  cy.get('li').eq(2).contains('to build a list of text')
})
```
