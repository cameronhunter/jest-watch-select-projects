const chalk = require('chalk');
const prompts = require('prompts');
const ansiEscapes = require('ansi-escapes');
const { readConfig } = require('jest-config');
const path = require('path');

class JestPluginProjects {
  constructor() {
    this._activeProjects = {};
  }

  apply(jestHook) {
    jestHook.onFileChange(({ projects }) => this._setProjects(projects));
    jestHook.shouldRunTestSuite(
      ({ testPath, config: { displayName } }) =>
        displayName === undefined ||
        this._activeProjects[displayName] === undefined ||
        this._activeProjects[displayName],
    );
  }

  onKey() {}

  _setProjects(projects) {
    if (!this._projectNames) {
      console.log(projects.slice(0, 2).map(p => p.config));
      this._projectNames = projects.map(p => {
        const projectName = p.config.displayName || path.basename(p.config.rootDir);

        if (!projectName) {
          throw new Error(`

Project in "${p.config.rootDir}" does not have a \`displayName\`.
In order to use \`jest-watch-select-projects\`, please add \`displayName\` to all the projects.

    - More info: https://facebook.github.io/jest/docs/en/configuration.html#projects-array-string-projectconfig
          `);
        }

        return projectName;
      });
      this._setActiveProjects(this._projectNames);
    }
  }

  _setActiveProjects(activeProjects) {
    this._numActiveProjects = activeProjects.length;
    this._activeProjects = this._projectNames.reduce((memo, name) => {
      memo[name] = activeProjects.includes(name);
      return memo;
    }, {});
  }

  run(globalConfig) {
    console.log(ansiEscapes.clearScreen);
    return prompts([
      {
        type: 'multiselect',
        name: 'activeProjects',
        message: 'Select projects',
        choices: this._projectNames.map(value => ({
          value,
          selected: this._activeProjects[value],
        })),
      },
    ]).then(({ activeProjects }) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      if (activeProjects !== undefined) {
        this._setActiveProjects(activeProjects);
        return true;
      }
      return Promise.reject();
    });
  }

  _getActiveProjectsText() {
    const numProjects = this._projectNames.length;

    if (this._numActiveProjects === numProjects) {
      return '(all selected)';
    } else if (this._numActiveProjects === 0) {
      return '(zero selected)';
    } else {
      return `(${this._numActiveProjects}/${numProjects} selected)`;
    }
    return;
  }

  getUsageInfo() {
    return {
      key: 'P',
      prompt: `select projects ${chalk.italic(this._getActiveProjectsText())}`,
    };
  }
}

module.exports = JestPluginProjects;
