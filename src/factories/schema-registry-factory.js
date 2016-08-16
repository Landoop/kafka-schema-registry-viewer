/**
 * Schema-Registry angularJS Factory
 * version 0.7 (16.Aug.2016)
 */
angularAPP.factory('SchemaRegistryFactory', function ($rootScope, $http, $location, $q, $log) {

  /**
   * Get subjects
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects
   */
  function getSubjects() {

    var url = SCHEMA_REGISTRY + '/subjects/';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();

    var deferred = $q.defer();
    $http.get(url)
      .then(
        function successCallback(response) {
          allSubjectNames = response.data;
          $log.debug("  curl -X GET " + url + " => " + allSubjectNames.length + " registered subjects in [ " + ((new Date().getTime()) - start) + " ] msec");
          deferred.resolve(allSubjectNames);
        },
        function errorCallback(response) {
          deferred.reject("Failure with : " + response)
        });

    return deferred.promise;
  }

  /**
   * Get subjects versions
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects-(string- subject)-versions
   */
  function getSubjectsVersions(subjectName) {

    var url = SCHEMA_REGISTRY + '/subjects/' + subjectName + '/versions/';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();

    var deferred = $q.defer();
    $http.get(url).then(
      function successCallback(response) {
        var allVersions = response.data;
        $log.debug("  curl -X GET " + url + " => " + JSON.stringify(allVersions) + " versions in [ " + (new Date().getTime() - start) + " ] msec");
        deferred.resolve(allVersions);
      },
      function errorCallback(response) {
        var msg = "Failure with : " + response + " " + JSON.stringify(response);
        $log.error("Error in getting subject versions : " + msg);
        deferred.reject(msg);
      });

    return deferred.promise;

  }

  /**
   * Get a specific version of the schema registered under this subject
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects-(string- subject)-versions-(versionId- version)
   */
  function getSubjectAtVersion(subjectName, version) {

    var url = SCHEMA_REGISTRY + '/subjects/' + subjectName + '/versions/' + version;
    $log.debug("  curl -X GET " + url);

    var deferred = $q.defer();
    var start = new Date().getTime();
    $http.get(url).then(
      function successCallback(response) {
        var subjectInformation = response.data;
        $log.debug("  curl -X GET " + url + " => [" + subjectName + "] subject " + JSON.stringify(subjectInformation).length + " bytes in [ " + (new Date().getTime() - start) + " ] msec");
        deferred.resolve(subjectInformation);
      },
      function errorCallback(response) {
        var msg = "Failure getting subject at version : " + response + " " + JSON.stringify(response);
        $log.error(msg);
        deferred.reject(msg);
      });

    return deferred.promise;

  }

  /**
   * Register a new schema under the specified subject. If successfully registered, this returns the unique identifier of this schema in the registry.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--subjects-(string- subject)-versions
   */
  function postNewSubjectVersion(subjectName, newSchema) {

    var deferred = $q.defer();
    $log.debug("Posting new version of subject [" + subjectName + "]");

    var postSchemaRegistration = {
      method: 'POST',
      url: SCHEMA_REGISTRY + '/subjects/' + subjectName + "/versions",
      data: '{"schema":"' + newSchema.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postSchemaRegistration)
      .success(function (data) {
        //$log.info("Success in registering new schema " + JSON.stringify(data));
        var schemaId = data.id;
        deferred.resolve(schemaId);
      })
      .error(function (data, status) {
        $log.info("Error on schema registration : " + JSON.stringify(data));
        var errorMessage = data.message;
        if (status >= 400) {
          $log.debug("Schema registrations is not allowed " + status + " " + data);
        } else {
          $log.debug("Schema registration failure: " + JSON.stringify(data));
        }
        deferred.reject(data);
      });

    return deferred.promise;

  }

  /**
   * Check if a schema has already been registered under the specified subject. If so, this returns the schema string
   * along with its globally unique identifier, its version under this subject and the subject name.
   *
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--subjects-(string- subject)
   */
  function checkSchemaExists(subjectName, subjectInformation) {

    var deferred = $q.defer();
    $log.debug("Checking if schema exists under this subject [" + subjectName + "]");

    var postSchemaExists = {
      method: 'POST',
      url: SCHEMA_REGISTRY + '/subjects/' + subjectName,
      data: '{"schema":"' + subjectInformation.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postSchemaExists)
      .success(function (data) {
        var response = {
          id: data.id,
          version: data.version
        };
        $log.info("Response : " + JSON.stringify(response));
        deferred.resolve(response);
      })
      .error(function (data, status) {
        $log.info("Error while checking if schema exists under a subject : " + JSON.stringify(data));
        var errorMessage = data.message;
        if (status == 407) {
          $log.debug("Subject not found or schema not found - 407 - " + status + " " + data);
        } else {
          $log.debug("Some other failure: " + JSON.stringify(data));
        }
        $defered.reject("Something")
      });

    return deferred.promise;

  }

  /**
   * Test input schema against a particular version of a subject’s schema for compatibility.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--compatibility-subjects-(string- subject)-versions-(versionId- version)
   */
  function testSchemaCompatibility(subjectName, subjectInformation) {

    var deferred = $q.defer();
    $log.debug("  Testing schema compatibility for [" + subjectName + "]");

    var postCompatibility = {
      method: 'POST',
      url: SCHEMA_REGISTRY + '/compatibility/subjects/' + subjectName + "/versions/latest",
      data: '{"schema":"' + subjectInformation.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postCompatibility)
      .success(function (data) {
        $log.info("Success in testing schema compatibility " + JSON.stringify(data));
        deferred.resolve(data.is_compatible + '')
      })
      .error(function (data, status) {
        $log.warn("Error on check compatibility : " + JSON.stringify(data));
        if (status == 404) {
          if (data.error_code == 40401) {
            $log.warn("40401 = Subject not found");
          }
          $log.warn("[" + subjectName + "] is a non existing subject");
          deferred.resolve("new"); // This will be a new subject (!)
        } else {
          $log.error("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
        }
        deferred.reject(data);
      });

    return deferred.promise;

  }

  /**
   * Put global config (Test input schema against a particular version of a subject’s schema for compatibility.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#put--config
   */
  function putConfig(compatibilityLevel) {

    var deferred = $q.defer();

    if (["NONE", "FULL", "FORWARD", "BACKWARD"].instanceOf(compatibilityLevel) != -1) {

      var postConfig = {
        method: 'POST',
        url: SCHEMA_REGISTRY + '/config',
        data: '{"compatibility":"' + compatibilityLevel + '"}' + "'",
        dataType: 'json',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
      };

      $http(postConfig)
        .success(function (data) {
          $log.info("Success in changing global schema-registry compatibility " + JSON.stringify(data));
          deferred.resolve(data.compatibility)
        })
        .error(function (data, status) {
          $log.info("Error on changing global compatibility : " + JSON.stringify(data));
          if (status == 422) {
            $log.warn("Invalid compatibility level " + JSON.stringify(status) + " " + JSON.stringify(data));
            if (JSON.stringify(data).indexOf('50001') > -1) {
              $log.error(" Error in the backend data store - " + $scope.text);
            } else if (JSON.stringify(data).indexOf('50003') > -1) {
              $log.error("Error while forwarding the request to the master: " + JSON.stringify(data));
            }
          } else {
            $log.debug("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
          }
          deferred.reject(data);
        });

    } else {
      $log.warn("Compatibility level:" + compatibilityLevel + " is not supported");
      deferred.reject();
    }

    return deferred.promise;

  }

  /**
   * Get global compatibility-level config
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--config
   */
  function getGlobalConfig() {

    var deferred = $q.defer();
    var url = SCHEMA_REGISTRY + '/config';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();
    $http.get(url)
      .success(function (data) {
        $log.debug("  curl -X GET " + url + " => in [ " + ((new Date().getTime()) - start) + "] msec");
        deferred.resolve(data)
      })
      .error(function (data, status) {
        deferred.reject("Get global config rejection : " + data + " " + status)
      });

    return deferred.promise;

  }

  /**
   * Update compatibility level for the specified subject
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#put--config-(string- subject)
   */
  function updateSubjectCompatibility(subjectName, newCompatibilityLevel) {

    var deferred = $q.defer();

    if (["NONE", "FULL", "FORWARD", "BACKWARD"].instanceOf(newCompatibilityLevel) != -1) {

      var postConfig = {
        method: 'POST',
        url: SCHEMA_REGISTRY + '/config/' + subjectName,
        data: '{"compatibility":"' + newCompatibilityLevel + '"}' + "'",
        dataType: 'json',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
      };

      $http(postConfig)
        .success(function (data) {
          $log.info("Success in changing subject [ " + subjectName + " ] compatibility " + JSON.stringify(data));
          deferred.resolve(data.compatibility)
        })
        .error(function (data, status) {
          $log.info("Error on changing compatibility : " + JSON.stringify(data));
          if (status == 422) {
            $log.warn("Invalid compatibility level " + JSON.stringify(status) + " " + JSON.stringify(data));
            if (JSON.stringify(data).indexOf('50001') > -1) {
              $log.error(" Error in the backend data store - " + $scope.text);
            } else if (JSON.stringify(data).indexOf('50003') > -1) {
              $log.error("Error while forwarding the request to the master: " + JSON.stringify(data));
            }
          } else {
            $log.debug("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
          }
          deferred.reject(data);
        });

    } else {
      $log.warn("Compatibility level:" + compatibilityLevel + " is not supported");
      deferred.reject();
    }

    return deferred.promise;

  }


  // Array holding caches subjects
  var allSchemas = [];

  // Helper functions
  function getFromCache(subjectName, subjectVersion) {
    var start = new Date().getTime();
    var searchVersion = "";
    if (subjectVersion == 'latest') {
      var max_version = 0;
      angular.forEach(allSchemas, function (subject) {
        if (subject.subjectName == subjectName) {
          if (subject.version > max_version) {
            max_version = subject.version
          }
        }
      });
      searchVersion = max_version;
      $log.info(subjectName + "/latest translated to " + subjectName + "/" + searchVersion)
    } else {
      searchVersion = subjectVersion;
    }

    var response = undefined;
    angular.forEach(allSchemas, function (subject) {
      if (subject.subjectName == subjectName && subject.version == searchVersion) {
        $log.debug("  [ " + subjectName + "/" + subjectVersion + " ] found in cache " + JSON.stringify(subject).length + " bytes in [ " + ((new Date().getTime()) - start) + " ] msec");
        response = subject;
      }
    });

    return response;
  }

  /* Public API */
  return {

    getSubjects: function () {
      return getSubjects();
    },
    getLatestSubjectFromCache: function (subjectName) {
      var subjectFromCache = getFromCache(subjectName, 'latest');
      if (subjectFromCache != undefined) {
        return subjectFromCache;
      } else {
        return 0;
      }
    },
    // Get one schema - particular version (with metadata)
    getSubjectsWithMetadata: function (subjectName, subjectVersion) {

      var deferred = $q.defer();

      // If it's easier to fetch it from cache
      var subjectFromCache = getFromCache(subjectName, subjectVersion);
      if (subjectFromCache != undefined) {
        deferred.resolve(subjectFromCache);
      } else {
        var start = new Date().getTime();
        getSubjectAtVersion(subjectName, subjectVersion).then(
          function successCallback(subjectInformation) {
            getSubjectsVersions(subjectName).then(
              function successCallback(allVersions) {
                var otherVersions = [];
                angular.forEach(allVersions, function (version) {
                  if (version != subjectVersion) {
                    otherVersions.push(version);
                  }
                });
                //cache it
                var subjectInformationWithMetadata = {
                  subjectName: subjectInformation.subject,
                  version: subjectInformation.version,
                  otherVersions: otherVersions, // Array
                  allVersions: allVersions,
                  id: subjectInformation.id,
                  schema: subjectInformation.schema, // this is text
                  Schema: JSON.parse(subjectInformation.schema) // this is json
                };
                $log.debug("  pipeline: " + subjectName + "/" + subjectVersion + " and [allVersions] in [ " + (new Date().getTime() - start) + " ] msec");
                deferred.resolve(subjectInformationWithMetadata);
              },
              function errorCallback(response) {
                $log.error("Failed at getting subject's versions : " + response + " " + JSON.stringify(response));
              });
          },
          function errorCallback(response) {
            $log.error("Failure with : " + JSON.stringify(response));
          });
      }
      return deferred.promise;

    },
    registerNewSchema: function (subjectName, subjectInformation) {
      return postNewSubjectVersion(subjectName, subjectInformation);
    },
    testSchemaCompatibility: function (subjectName, subjectInformation) {
      return testSchemaCompatibility(subjectName, subjectInformation);
    },
    getGlobalConfig: function () {
      return getGlobalConfig();
    },
    getSubjectHistory: function (subjectName) {
      var deferred = $q.defer();
      var completeSubjectHistory = [];
      getSubjectsVersions(subjectName).then(
        function (allVersions) {
          var urlCalls = [];
          angular.forEach(allVersions, function (version) {
            // If in cache
            var subjectFromCache = getFromCache(subjectName, version);
            if (subjectFromCache != undefined) {
              $log.debug('from cache');
              $log.debug(subjectFromCache);
              completeSubjectHistory.push(subjectFromCache);
              // else add to fetch list
            } else {
              urlCalls.push($http.get(SCHEMA_REGISTRY + '/subjects/' + subjectName + '/versions/' + version));
            }
          });

          $q.all(urlCalls).then(function (results) {
            angular.forEach(results, function (result) {
              // $log.debug("..pushing " + result.data.schema);
              completeSubjectHistory.push(result.data);
            });

            // Now build up left-right
            var changelog = [];
            var originalSubjectVersion = completeSubjectHistory[0].version;
            var originalSubjectID = completeSubjectHistory[0].id;
            for (var i = completeSubjectHistory.length - 1; i > 0; i--) {
              $log.warn(completeSubjectHistory[i]);
              var l = JSON.parse(completeSubjectHistory[i].schema);
              var r = JSON.parse(completeSubjectHistory[i - 1].schema);
              var changeDetected = {
                originalSubjectVersion: originalSubjectVersion,
                version: completeSubjectHistory[i].version,
                id: completeSubjectHistory[i].id,
                originalSubjectID: originalSubjectID,
                left: {
                  text: l
                }
                ,
                right: {
                  text: r
                }
              };
              changelog.push(changeDetected);
            }

            //$log.info("..resolving with " + changelog);
            deferred.resolve(changelog);
          });

        },
        function (failure) {
          $log.error("failure-" + failure);
        }
      );
      return deferred.promise;
    },
    getSubjectsVersions: function (subjectName) {
      return getSubjectsVersions(subjectName);
    },
    fetchLatestSubjects: function () {
      allSchemas = [];
      var allSubjectNames = []; // All available subject names in the schema registry
      var deferred = $q.defer();
      setTimeout(function () {
        deferred.notify("Initially get all subjects (just latest versions)");

        // 1. Get all subject names
        getSubjects()
        // 2. Get full details of subject's final versions
          .then(
            function successCallback(allSubjectNames) {
              var urlCalls = [];
              angular.forEach(allSubjectNames, function (subject) {
                urlCalls.push($http.get(SCHEMA_REGISTRY + '/subjects/' + subject + '/versions/latest'));
              });
              $q.all(urlCalls).then(function (results) {
                angular.forEach(results, function (result) {
                  // result.data contains:
                  //   version   - latest version
                  //   id        - latest schema id
                  //   schema    - escaped JSON schema i.e. {\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"}]}

                  // Collect available versions
                  $http.get(SCHEMA_REGISTRY + '/subjects/' + result.data.subject + '/versions/').then(
                    function successCallback(response) {
                      var allVersions = response.data;
                      var otherVersions = [];
                      angular.forEach(allVersions, function (version) {
                        if (version != result.data.version) {
                          otherVersions.push(version);
                          //$log.debug("Pushing version " + version);
                        }
                      });

                      // Always cast from JSon to maintain a data contract
                      var cacheData = {
                        subjectName: result.data.subject,
                        version: result.data.version,
                        otherVersions: otherVersions, // Array
                        allVersions: allVersions,
                        id: result.data.id,
                        schema: result.data.schema,
                        Schema: JSON.parse(result.data.schema)
                        // Schema object is a javascript object
                        //   type    - i.e. "record"
                        //   name    - i.e. "User"
                        //   doc     - i.e. "Avro documentation"
                        //   fields
                        //      name
                        //      type
                        //      default
                        //      doc
                        //schemaText: angular.toJson(result.data.schemaObj, true)
                      };
                      allSchemas.push(cacheData);
                    },
                    function errorCallback(response) {
                      deferred.reject("Failure with : " + response);
                      $log.error("Failure with : " + response)
                    });

                });
              });
            });

      }, 1);
      $rootScope.showSpinner = false;
      deferred.resolve(allSchemas);

      return deferred.promise;
    },
    IsJsonString: function (str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    }

//     if () {
//       $scope.showSimpleToastToTop("Schema is compatible");
//     } else {
//       $scope.showSimpleToastToTop("Schema is NOT compatible");
// }

  }

})
;