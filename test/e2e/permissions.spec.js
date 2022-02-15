'use strict';

const chai = require('chai');
var {assert, expect} = chai;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const U = require('../../test/mocha.test.util');
const _ = require('lodash');
const puppeteer = require('puppeteer');

describe('TESTING PERMISSIONS', function () {
  let agent;
  let cookies = [];
  let token = '';
  
  before(async () => {
    agent = chai.request.agent(U.getServer());
    await U.insertProject(U.privateProjectTest);
    try {
      await agent.post('/localSignup')
        .send(U.testingCredentials)
        .timeout(1000); // FIXME: (in nwl)works but hangs indefinitely
    } catch(_e) {
      //
    }
    let res = await agent.post('/localLogin').redirects(0)
      .send(U.testingCredentials);
    expect(res).to.have.cookie('connect.sid');
    cookies = U.parseCookies(res.headers['set-cookie'][0]);
    
    res = await agent.get('/token');
    assert.exists(res.body.token);
    assert.isNotEmpty(res.body.token);
    token = res.body.token;
  });
  
  after(async function () {
    await U.removeProject(U.privateProjectTest.shortname);
    await U.removeUser(U.testingCredentials.username);
  });
  
  const get = function(url, logged) {
    if (logged) {
      return agent.get(url).query({ token });
    }
  
    return chai.request(U.serverURL).get(url);
  };
  
  const post = function(url, logged) {
    if (logged) {
      return agent.post(`${url}?token=${token}`);
    }
  
    return chai.request(U.serverURL).post(url);
  };
  
  const del = function(url, logged) {
    if (logged) {
      return agent.del(url).query({ token });
    }
  
    return chai.request(U.serverURL).del(url);
  };

  const forbiddenStatusCodes = [403, 401];

  describe('Test basic unprivileged access', function() {

    ['unlogged', 'logged'].forEach((userStatus) => {

      const logged = userStatus === 'logged';

      it(`Disallows accessing a private project (${userStatus})`, async function () {
        const res = await get('/project/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows accessing a private project settings (${userStatus})`, async function () {
        const res = await get('/project/' + U.privateProjectTest.shortname + '/settings', logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows accessing a private project using JSON api (${userStatus})`, async function () {
        const res = await get('/project/json/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows updating a private project (${userStatus})`, async function () {
        const res = await post('/project/json/' + U.privateProjectTest.shortname, logged)
          .send({data: U.privateProjectTest});
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows deleting a private project (${userStatus})`, async function () {
        const res = await del('/project/json/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });
    });
  });

  describe('Test specific edit / add / remove permissions of logged users', function() {

    const projects = {};
    const setupProjectWithAccess = (access, name) => {
      const project = U.createProjectWithPermission(name, access);
      projects[project.name] = project;
      U.insertProject(project);
    };

    before(function () {
      ["none", "view", "edit", "add", "remove"].forEach((access) => {
        setupProjectWithAccess(
          { files: access },
          `files${access}`
        );
        setupProjectWithAccess(
          { files: 'edit', collaborators: access },
          `collaborators${access}filesedit`
        );
        setupProjectWithAccess(
          { files: 'edit', annotations: access },
          `fileseditannotations${access}`
        );
      });
    });

    after(function() {
      Object.keys(projects).forEach((shortname) => {
        U.removeProject(shortname);
      });
    });

    it('Checks that collaborators cannot edit a project if files is set to none', async function() {
      const project = _.cloneDeep(projects.filesnone);
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.oneOf(res.statusCode, forbiddenStatusCodes);
    });

    it('Checks that collaborators cannot remove a project if files  is set to none', async function() {
      const project = _.cloneDeep(projects.filesnone);
      const res = await del('/project/json/' + project.shortname, true);
      assert.oneOf(res.statusCode, forbiddenStatusCodes);
    });

    it('Checks that collaborators can edit a project if files is set to add', async function() {
      const project = _.cloneDeep(projects.filesadd);
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
    });

    it('Checks that collaborators can edit a project if files is set to edit', async function() {
      const project = _.cloneDeep(projects.filesedit);
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
    });

    it('Checks that collaborators can edit a project if files is set to remove', async function() {
      const project = _.cloneDeep(projects.filesremove);
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
    });

    it('Checks that collaborators cannot add project collaborators if set to none or view', async function() {
      let project = _.cloneDeep(projects.collaboratorsnonefilesedit);
      let initialProjectState = _.cloneDeep(project);
      project.collaborators.list.push({
        userID: "foo",
        access: {
          collaborators: "edit",
          annotations: "edit",
          files: "edit"
        },
        username: "foo",
        name: "Foo"
      });

      let res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      let fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);

      project = _.cloneDeep(projects.collaboratorsviewfilesedit);
      initialProjectState = _.cloneDeep(project);
      project.collaborators.list.push({
        userID: "foo",
        access: {
          collaborators: "edit",
          annotations: "edit",
          files: "edit"
        },
        username: "foo",
        name: "Foo"
      });
      res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);

    });

    it('Checks that collaborators cannot remove project collaborators if set to none', async function() {
      const project = _.cloneDeep(projects.collaboratorsnonefilesedit);
      const initialProjectState = _.cloneDeep(project);
      project.collaborators.list.splice(1, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators cannot remove project collaborators if set to view', async function() {
      const project = _.cloneDeep(projects.collaboratorsviewfilesedit);
      const initialProjectState = _.cloneDeep(project);
      project.collaborators.list.splice(1, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators cannot remove project collaborators if set to add', async function() {
      const project = _.cloneDeep(projects.collaboratorsaddfilesedit);
      const initialProjectState = _.cloneDeep(project);
      project.collaborators.list.splice(1, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators can add project collaborators if set to add or remove', async function() {
      let project = projects.collaboratorsaddfilesedit;
      let initialProjectState = _.cloneDeep(project);
      project.collaborators.list.push({
        userID: "foo",
        access: {
          collaborators: "edit",
          annotations: "edit",
          files: "edit"
        },
        username: "foo",
        name: "Foo"
      });

      let res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      // check that collaborators got modified
      let projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.collaborators.list.length, initialProjectState.collaborators.list.length);

      project = projects.collaboratorsremovefilesedit;
      initialProjectState = _.cloneDeep(project);
      project.collaborators.list.push({
        userID: "foo",
        access: {
          collaborators: "edit",
          annotations: "edit",
          files: "edit"
        },
        username: "foo",
        name: "Foo"
      });
      res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators can remove project collaborators if set to remove', async function() {
      const project = _.cloneDeep(projects.collaboratorsremovefilesedit);
      const initialProjectState = _.cloneDeep(project);
      project.collaborators.list.splice(1, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const projectFromDB = await U.queryProject(project.shortname);
      assert.isBelow(projectFromDB.collaborators.list.length, initialProjectState.collaborators.list.length);
    });


    it('Checks that collaborators cannot add project annotations if set to none', async function() {
      const project = _.cloneDeep(projects.fileseditannotationsnone);
      const initialProjectState = _.cloneDeep(project);
      project.annotations.list.push({
        type: "text",
        name: "Annotation name",
        values: null
      });
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators cannot add project annotations if set to view', async function() {
      const project = _.cloneDeep(projects.fileseditannotationsview);
      const initialProjectState = _.cloneDeep(project);
      project.annotations.list.push({
        type: "text",
        name: "Annotation name",
        values: null
      });
      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators can add project annotations if set to add or remove', async function() {
      let project = projects.fileseditannotationsadd;
      let initialProjectState = _.cloneDeep(project);
      project.annotations.list.push({
        type: "text",
        name: "Annotation name",
        values: null
      });
      let res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      let projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.annotations.list.length, initialProjectState.annotations.list.length);

      project = projects.fileseditannotationsremove;
      initialProjectState = _.cloneDeep(project);
      project.annotations.list.push({
        type: "text",
        name: "Annotation name",
        values: null
      });
      res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.annotations.list.length, initialProjectState.annotations.list.length);
    });

    it('Checks that collaborators cannot remove project annotations if set to none', async function() {
      const project = _.cloneDeep(projects.fileseditannotationsnone);
      const initialProjectState = _.cloneDeep(project);
      project.annotations.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators cannot remove project annotations if set to view', async function() {
      const project = _.cloneDeep(projects.fileseditannotationsview);
      const initialProjectState = _.cloneDeep(project);
      project.annotations.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });

    it('Checks that collaborators cannot remove project annotations if set to add', async function() {
      const project = _.cloneDeep(projects.fileseditannotationsadd);
      const initialProjectState = _.cloneDeep(project);
      project.annotations.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const fromDb = await U.queryProject(project.shortname);
      assert.equal(fromDb.collaborators.list.length, initialProjectState.collaborators.list.length);
    });


    it('Checks that collaborators cannot add project files if set to none or view', async function() {
      let project = _.cloneDeep(projects.filesnone);
      project.files.list.push({source: "https://zenodo.org/record/44855/files/MRI-n4.nii.gz", name: "MRI-n4.nii.gz"});
      let res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.oneOf(res.statusCode, forbiddenStatusCodes);

      project = _.cloneDeep(projects.filesview);
      project.files.list.push({source: "https://zenodo.org/record/44855/files/MRI-n4.nii.gz", name: "MRI-n4.nii.gz"});
      res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.oneOf(res.statusCode, forbiddenStatusCodes);
    });

    it('Checks that collaborators can add project files if set to add or remove', async function() {
      let project = _.cloneDeep(projects.filesadd);
      let initialProjectState = _.cloneDeep(project);
      project.files.list.push({source: "https://zenodo.org/record/44855/files/MRI-n4.nii.gz", name: "MRI-n4.nii.gz"});
      let res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      let projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.files.list.length, initialProjectState.files.list.length);

      project = _.cloneDeep(projects.filesremove);
      initialProjectState = _.cloneDeep(project);
      project.files.list.push({source: "https://zenodo.org/record/44855/files/MRI-n4.nii.gz", name: "MRI-n4.nii.gz"});
      res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      projectFromDB = await U.queryProject(project.shortname);
      assert.isAbove(projectFromDB.files.list.length, initialProjectState.files.list.length);
    });

    it('Checks that collaborators cannot remove project files if set to none', async function() {
      const project = _.cloneDeep(projects.filesnone);
      project.files.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.oneOf(res.statusCode, forbiddenStatusCodes);
    });

    it('Checks that collaborators cannot remove project files if set to view', async function() {
      const project = _.cloneDeep(projects.filesview);
      project.files.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.oneOf(res.statusCode, forbiddenStatusCodes);
    });

    it('Checks that collaborators cannot remove project files if set to add', async function() {
      let project = U.createProjectWithPermission('permissionTest', { files: 'add' });
      projects.permissionTest = project;
      U.insertProject(project);

      const initialProjectState = _.cloneDeep(project);
      project = _.cloneDeep(project);
      project.files.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const projectFromDB = await U.queryProject(project.shortname);
      assert.equal(projectFromDB.files.list.length, initialProjectState.files.list.length);
    });

    it('Checks that collaborators can remove project files if set to remove', async function() {
      const project = _.cloneDeep(projects.filesremove);
      const initialProjectState = _.cloneDeep(project);
      project.files.list.splice(0, 1);

      const res = await post('/project/json/' + project.shortname, true)
        .send({data: project});
      assert.equal(res.statusCode, 200);
      const projectFromDB = await U.queryProject(project.shortname);
      assert.isBelow(projectFromDB.files.list.length, initialProjectState.files.list.length);
    });

    describe('Test view permissions of logged users', function() {
      let browser, page;
  
      before(async function() {
        browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        page = await browser.newPage();
        await page.setCookie(...cookies);
      });
  
      after(function() {
        browser.close();
      });
  
      it('Check that collaborators cannot see other collaborators if not permitted', async function () {
        const project = _.cloneDeep(projects.collaboratorsnonefilesedit);
        const response = await page.goto(U.serverURL + '/project/' + project.shortname + '/settings');
        assert.equal(response.status(), 200);
        await page.waitForSelector('#access tbody');
        const contributorsTableLength = (await page.$$('#access tbody tr')).length;
        assert.equal(contributorsTableLength, 1); // 'anyone' only
      }).timeout(U.longTimeout);
  
      it('Check that collaborators cannot see other collaborators if not permitted using JSON API', async function () {
        const project = _.cloneDeep(projects.collaboratorsnonefilesedit);
        const res = await get('/project/json/' + project.shortname, true);
        assert.equal(res.body.collaborators.list.length, 1);
      });
  
      it('Check that collaborators cannot see other annotations if not permitted', async function () {
        const project = _.cloneDeep(projects.fileseditannotationsnone);
        const response = await page.goto(U.serverURL + '/project/' + project.shortname + '/settings');
        assert.equal(response.status(), 200);
        await page.waitForSelector('#annotations tbody');
        const annotationsTableLength = (await page.$$('#annotations tbody tr')).length;
        assert.equal(annotationsTableLength, 1); // placeholder
      }).timeout(U.longTimeout);
  
    });    

  });


});
