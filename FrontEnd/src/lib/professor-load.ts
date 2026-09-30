import {professorApi} from './api';
export async function professorOverview(){const [links,exams,attempts,grades,objections]=await Promise.all([professorApi.courses(),professorApi.exams(),professorApi.attempts(),professorApi.grades(),professorApi.objections()]);return {links,exams,attempts,grades,objections}}
