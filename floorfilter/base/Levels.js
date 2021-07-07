/* Copyright 2019 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define(["dojo/_base/declare"],
function(declare) {

  const Levels = declare(null, {

    context: null,
    data: null,
    url: null,

    constructor: function(props) {
      Object.assign(this,props);
    },

    getBaseLevel: function(facilityId) {
      const facilityData = this.getFacilityData(facilityId);
      return facilityData && facilityData.baseLevel;
    },

    getBaseLevelId: function(facilityId) {
      const facilityData = this.getFacilityData(facilityId);
      const baseLevel = facilityData && facilityData.baseLevel;
      if (baseLevel) {
        return baseLevel.levelId;
      }
      return null;
    },

    getFacilities: function() {
      return this.data && this.data.facilities;
    },

    getFacilityData: function(facilityId) {
      if (this.data && this.data.facilitiesById) {
        return this.data.facilitiesById[facilityId];
      }
      return null;
    },

    hasData: function() {
      return (this.data && this.data.facilitiesById &&
        Object.keys(this.data.facilitiesById).length > 0);
    },

    load: function(task) {
      return this._queryAll(task);
    },

    validateFacilityId: function(facilityId) {
      if (facilityId) {
        const facilityData = this.getFacilityData(facilityId);
        if (facilityData) return facilityId;
      }
      return null;
    },

    validateLevelId: function(facilityId,levelId) {
      if (facilityId && levelId) {
        const facilityData = this.getFacilityData(facilityId);
        if (facilityData) {
          const levelData = facilityData.levelsById[levelId];
          if (levelData) return levelId;
        };
      }
      return null;
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _queryAll: function(task) {

      const promise = new Promise((resolve,reject) => {
        const context = this.context;
        const jsapi = context.jsapi;
        const FieldNames = context.aiim.FieldNames;
        const util = context.util;
        const url = this.url;
        const facilitiesById = {};
        const facilities = [];
        const facilityIdField = FieldNames.FACILITY_ID;
        const facilityNameField = FieldNames.FACILITY_NAME;
        const levelIdField = FieldNames.LEVEL_ID;
        const levelNameField = FieldNames.NAME;
        const levelNumberField = FieldNames.LEVEL_NUMBER;
        const levelShortNameField = FieldNames.NAME_SHORT;
        const voField = FieldNames.VERTICAL_ORDER;
        const queryProps = {
          outFields: ["*"],
          returnGeometry: false,
          returnZ: false,
          where: "1=1"
        };

        jsapi.queryLayer(task,url,queryProps).then(result => {
          const features = result && result.features;
          if (features) {
            features.forEach(feature => {
              if (feature && feature.attributes) {
                const attributes = feature.attributes;
                const facilityId = util.getAttributeValue(attributes,facilityIdField);
                const facilityName = util.getAttributeValue(attributes,facilityNameField);
                const levelId = util.getAttributeValue(attributes,levelIdField);
                const levelName = util.getAttributeValue(attributes,levelNameField);
                if (typeof levelName === "undefined") reject("NAME field required on LEVELS Layer.")
                const levelNumber = util.getAttributeValue(attributes,levelNumberField);
                const levelShortName = util.getAttributeValue(feature.attributes,levelShortNameField);
                if (typeof levelShortName === "undefined") reject("SHORT_NAME field required on LEVELS Layer.")
                const vo = util.getAttributeValue(attributes,voField);
                if (typeof facilityId === "string" && facilityId.length > 0) {

                  let facilityData;
                  if (facilitiesById[facilityId]) {
                    facilityData = facilitiesById[facilityId];
                  } else {
                    facilityData = {
                      facilityId: facilityId,
                      facilityName: facilityName,
                      levels: [],
                      levelsById: {},
                      levelsByVO: {},
                      baseLevel: null,
                      baseVO: null
                    };
                    facilities.push(facilityData);
                    facilitiesById[facilityId] = facilityData;
                  }

                  const levelData = {
                    facilityId: facilityId,
                    facilityName: facilityName,
                    levelId: levelId,
                    levelName: levelName,
                    levelNumber: levelNumber,
                    levelShortName: levelShortName,
                    verticalOrder: vo
                  }
                  facilityData.levels.push(levelData);
                  facilityData.levelsById[levelId] = levelData;
                  facilityData.levelsByVO[vo] = levelData;

                  if (typeof vo === "number" && isFinite(vo)) {
                    const baseVO = facilityData.baseVO;
                    if (vo >= 0) {
                      if (baseVO === null || baseVO < 0 || vo < baseVO) {
                        facilityData.baseLevel = levelData;
                        facilityData.baseVO = vo;
                      }
                    } else if (vo < 0) {
                      if (baseVO === null || (baseVO < 0 && vo > baseVO)) {
                        facilityData.baseLevel = levelData;
                        facilityData.baseVO = vo;
                      }
                    }
                  }

                }
              }
            });

          }

          const data = {
            facilities: facilities,
            facilitiesById: facilitiesById
          }
          this._sort(data);
          if (!this.data) this.data = data;
          resolve(data);

        }).catch(ex => {
          console.error(context.msgPrefix+"Levels::load error",ex);
          reject(ex);
        });
      });
      return promise;
    },

    _sort: function(data) {
      const facilities = data.facilities;
      facilities.sort((a,b) => {
        if (a.facilityName === b.facilityName) return 0;
        if (a.facilityName > b.facilityName) return 1;
        return -1;
      });
      facilities.forEach(facility => {
        this._sortLevels(facility.levels);
      });

      // facilities.forEach(facility => {
      //   console.log(facility.facilityName);
      //   facility.levels.forEach(levelData => {
      //     console.log("  ",levelData.levelId);
      //   });
      // });
    },

    _sortLevels: function(levels) {
      levels.sort((a,b) => {
        if (a.verticalOrder === b.verticalOrder) return 0;
        if (a.verticalOrder > b.verticalOrder) return 1;
        return -1;
      });
    }

  });

  return Levels;
});
