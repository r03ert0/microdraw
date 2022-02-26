/* globals userInfo, loggedUser */
import 'nwl-components/dist/style.css';
import { Tab, Table, Tabs, UserPage } from 'nwl-components';
import { createApp, ref } from 'vue';
import config from './nwl-components-config';

const PageContents = {
  template: '#template',
  setup() {
    const projects = ref([]);
    const atlas = ref([]);
    const files = ref([]);

    return {
      projects,
      atlas,
      files,
      userInfo
    };
  },
  mounted() {
    const fetchProjects = async () => {
      const res = await (await fetch(`/user/json/${userInfo.username}/projects?start=${this.projects.length}&length=100`)).json();
      if (res.successful & (res.list.length > 0)) {
        this.projects.push(...res.list);
        console.log('proj', res.list);
      }
    };

    const fetchAtlas = async () => {
      const res = await (await fetch(`/user/json/${userInfo.username}/atlas?start=${this.atlas.length}&length=100`)).json();
      if (res.successful & (res.list.length > 0)) {
        this.atlas.push(...res.list);
        console.log('atlast', res.list);
      }
    };

    const fetchFiles = async () => {
      const res = await (await fetch(`/user/json/${userInfo.username}/files?start=${this.files.length}&length=100`)).json();
      if (res.success & (res.list.length > 0)) {
        this.files.push(...res.list);
        console.log('files', res.list);
      }
    };

    fetchProjects();
    fetchAtlas();
    fetchFiles();
  },
  compilerOptions: {
    delimiters: ['[[', ']]']
  }
};
const app = createApp(PageContents);
app.component('UserPage', UserPage);
app.component('Tabs', Tabs);
app.component('Tab', Tab);
app.component('Table', Table);
app.provide('config', config);
app.provide('user', loggedUser);

app.mount('#app');
