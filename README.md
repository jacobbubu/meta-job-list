# @jacobbubu/meta-job-list

[![Build Status](https://github.com/jacobbubu/meta-job-list/workflows/Build%20and%20Release/badge.svg)](https://github.com/jacobbubu/meta-job-list/actions?query=workflow%3A%22Build+and+Release%22)
[![Coverage Status](https://coveralls.io/repos/github/jacobbubu/meta-job-list/badge.svg)](https://coveralls.io/github/jacobbubu/meta-job-list)
[![npm](https://img.shields.io/npm/v/@jacobbubu/meta-job-list.svg)](https://www.npmjs.com/package/@jacobbubu/meta-job-list/)

> Combine JobList and MergedModel to implement a JobList that cleans up jobs based on the number of how many peers been synced.

## Intro.

I use a MergedModel to keep track of how many peers have synced for each job, so I can boldly delete the job.

`MetaJobList` is a class that combine a jobList and a mergedModel that used to store meta data.

`CappedJobList` is more like an example to show how to use `MetaJobList`. it shows how to set a sync threshold. When the number of peers synced to a job reaches this threshold, we delete the job and `applyUpdate` will not accept any further updates to the job.

Please use the [example](./examples/ex1.ts) to understand how this logic works.

