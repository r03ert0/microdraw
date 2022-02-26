/* global loggedUser */

import 'nwl-components/dist/style.css';
import { createApp, ref } from 'vue';
import { NewProjectPage } from 'nwl-components';
import config from './nwl-components-config';

const debounce = (callback, delay = 250) => {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      callback(...args);
    }, delay);
  };
};

const NewPage = {
  template: `
      <NewProjectPage
        :onKeyDown="checkInput"
        :existing-project="existingProject"
        :validInput="validInput"
      >
        A project contains a list of histological files, a set of vectorials or
        text annotations, and a list of collaborators with their access rights.
        The short name of a project can only contain letters and numbers, but
        you can choose a longer display name later.
      </NewProjectPage>
    `,
  setup() {
    const existingProject = ref(false);
    const validInput = ref(true);

    const checkIfProjectIsExisting = debounce(async (projectName) => {
      const res = await fetch(`/project/json/${projectName}`);
      existingProject.value = (res.status === 200);
    });

    return {
      existingProject,
      validInput,
      checkInput(event) {
        if(event.target.value.length > 0) {
          checkIfProjectIsExisting(event.target.value);
          validInput.value = (/^[a-zA-Z0-9]*$/).test(event.target.value);
        }
      }
    };
  }
};

const app = createApp(NewPage);
app.component('NewProjectPage', NewProjectPage);
app.provide('config', config);
app.provide('user', loggedUser);

app.mount('#app');
