import type { SinonStub } from 'sinon'
import defaultMessages from '@packages/frontend-shared/src/locales/en-US.json'
import { getPathForPlatform } from '../../src/paths'
import { snapshotAUTPanel } from './support/snapshot-aut-panel'

describe('Cypress In Cypress CT', { viewportWidth: 1500, defaultCommandTimeout: 10000 }, () => {
  beforeEach(() => {
    cy.scaffoldProject('cypress-in-cypress')
    cy.findBrowsers()
  })

  it('test component', () => {
    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp()
    cy.contains('TestComponent.spec').click()
    cy.location().should((location) => {
      expect(location.hash).to.contain('TestComponent.spec')
    })

    cy.get('[data-model-state="passed"]').should('contain', 'renders the test component')

    cy.findByTestId('aut-url').should('not.exist')
    cy.findByTestId('select-browser').click()

    cy.contains('Canary').should('be.visible')
    cy.findByTestId('viewport').click()

    snapshotAUTPanel('browsers open')
    cy.contains('Canary').should('be.hidden')
    cy.contains('The viewport determines the width and height of your application. By default the viewport will be 500px by 500px for Component Testing unless specified by a cy.viewport command.')
    .should('be.visible')

    snapshotAUTPanel('viewport info open')

    cy.get('body').click()

    cy.findByTestId('playground-activator').click()
    cy.findByTestId('playground-selector').clear().type('[data-cy-root]')

    snapshotAUTPanel('cy.get selector')

    cy.findByTestId('playground-num-elements').contains('1 Match')

    cy.window().then((win) => cy.spy(win.console, 'log'))
    cy.findByTestId('playground-print').click().window().then((win) => {
      expect(win.console.log).to.have.been.calledWith('%cCommand:  ', 'font-weight: bold', 'cy.get(\'[data-cy-root]\')')
    })

    cy.findByLabelText('Selector Methods').click()
    cy.findByRole('menuitem', { name: 'cy.contains' }).click()

    cy.findByTestId('playground-selector').clear().type('Component Test')

    snapshotAUTPanel('cy.contains selector')

    cy.findByTestId('playground-num-elements').contains('1 Match')
  })

  it('navigation between specs and other parts of the app works', () => {
    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp()
    cy.contains('TestComponent.spec').click()
    cy.get('[data-model-state="passed"]').should('contain', 'renders the test component')

    // go to Settings page and back to spec runner
    cy.contains('a', 'Settings').click()
    cy.contains(defaultMessages.settingsPage.device.title).should('be.visible')
    cy.contains('a', 'Specs').click()
    cy.contains('TestComponent.spec').click()
    cy.get('[data-model-state="passed"]').should('contain', 'renders the test component')

    // go to Runs page and back to spec runner
    cy.contains('a', 'Runs').click()
    cy.contains(defaultMessages.runs.connect.title).should('be.visible')
    cy.contains('a', 'Specs').click()
    cy.contains('TestComponent.spec').click()
    cy.get('[data-model-state="passed"]').should('contain', 'renders the test component')
  })

  it('redirects to the specs list with error if a spec is not found', () => {
    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp()
    const { noSpecErrorTitle, noSpecErrorIntro, noSpecErrorExplainer } = defaultMessages.specPage
    const badFilePath = 'src/DoesNotExist.spec.js'

    cy.visitApp(`/specs/runner?file=${badFilePath}`)
    cy.contains(noSpecErrorTitle).should('be.visible')
    cy.contains(noSpecErrorIntro).should('be.visible')
    cy.contains(noSpecErrorExplainer).should('be.visible')
    cy.contains(getPathForPlatform(badFilePath)).should('be.visible')
    cy.location()
    .its('href')
    .should('eq', 'http://localhost:4455/__/#/specs')

    // should clear after reload
    cy.reload()
    cy.contains(noSpecErrorTitle).should('not.exist')
  })

  it('redirects to the specs list with error if an open spec is not found when specs list updates', () => {
    const { noSpecErrorTitle, noSpecErrorIntro, noSpecErrorExplainer } = defaultMessages.specPage

    const goodFilePath = 'src/TestComponent.spec.jsx'

    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp(`/specs/runner?file=${goodFilePath}`)

    cy.contains('renders the test component').should('be.visible')

    cy.withCtx((ctx, o) => {
      ctx.actions.project.setSpecs(ctx.project.specs.filter((spec) => !spec.absolute.includes(o.path)))
    }, { path: goodFilePath }).then(() => {
      cy.contains(noSpecErrorTitle).should('be.visible')
      cy.contains(noSpecErrorIntro).should('be.visible')
      cy.contains(noSpecErrorExplainer).should('be.visible')
      cy.contains(getPathForPlatform(goodFilePath)).should('be.visible')
      cy.location()
      .its('href')
      .should('eq', 'http://localhost:4455/__/#/specs')
    })
  })

  it('browser picker in runner calls mutation with current spec path', () => {
    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp()
    cy.contains('TestComponent.spec').click()
    cy.get('[data-model-state="passed"]').should('contain', 'renders the test component')

    cy.withCtx((ctx, o) => {
      o.sinon.stub(ctx.actions.app, 'setActiveBrowserById')
      o.sinon.stub(ctx.actions.project, 'launchProject').resolves()
    })

    cy.get('[data-cy="select-browser"]')
    .click()

    cy.contains('Firefox')
    .click()

    cy.withCtx((ctx, o) => {
      const browserId = (ctx.actions.app.setActiveBrowserById as SinonStub).args[0][0]
      const genId = ctx.fromId(browserId, 'Browser')

      expect(ctx.actions.app.setActiveBrowserById).to.have.been.calledWith(browserId)
      expect(genId).to.eql('firefox-firefox-stable')
      expect(ctx.actions.project.launchProject).to.have.been.calledWith(
        ctx.coreData.currentTestingType, {}, o.sinon.match(new RegExp('cypress\-in\-cypress\/src\/TestComponent\.spec\.jsx$')),
      )
    })
  })

  it('set the correct viewport values from CLI', () => {
    cy.openProject('cypress-in-cypress', ['--config', 'viewportWidth=333,viewportHeight=333'])
    cy.startAppServer('component')

    cy.visitApp()
    cy.contains('TestComponent.spec').click()

    cy.get('#unified-runner').should('have.css', 'width', '333px')
    cy.get('#unified-runner').should('have.css', 'height', '333px')
  })

  it('restarts dev server on config change', () => {
    cy.openProject('cypress-in-cypress')
    cy.startAppServer('component')
    cy.visitApp()

    cy.withCtx(async (ctx, { testState, sinon }) => {
      sinon.stub(ctx._apis.projectApi.getDevServer(), 'close')
      const devServerReady =
        new Promise((res) => {
          ctx._apis.projectApi.getDevServer().emitter.on('dev-server:compile:success', (err) => res(true))
        })

      testState.originalCypressConfig = await ctx.file.readFileInProject('cypress.config.js')
      const newCypressConfig = testState.originalCypressConfig.replace(`webpackConfig: require('./webpack.config.js')`, `webpackConfig: {}`)

      await ctx.actions.file.writeFileInProject('cypress.config.js', newCypressConfig)
      await devServerReady
    })

    cy.contains('TestComponent.spec').click()
    cy.get('.failed > .num').should('contain', 1)

    cy.withCtx(async (ctx, { testState }) => {
      await ctx.actions.file.writeFileInProject('cypress.config.js', testState.originalCypressConfig)
    })

    cy.get('.passed > .num').should('contain', 1)
  })
})
