require("util").inspect.defaultOptions.depth = null;

const Pool = require("pg").Pool;
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "test",
  password: "password",
  port: 5432,
});

const handleData = (res) => {
  let result = [];

  let tmp = {};
  let student_ids = [];
  let teacher_ids = [];

  res.forEach((obj, index) => {
    if (obj.id !== tmp.id && Object.keys(tmp).length > 0) {
      result.push({
        id: tmp.id,
        date: tmp.date,
        title: tmp.title,
        status: tmp.status,
        visitCount: tmp.visitCount,
        students: tmp.students,
        teachers: tmp.teachers,
      });

      for (const key in tmp) {
        delete tmp[key];
      }

      student_ids = [];
      teacher_ids = [];
    }

    if (tmp.visitCount === undefined) tmp.visitCount = 0;
    if (tmp.students === undefined) tmp.students = [];
    if (tmp.teachers === undefined) tmp.teachers = [];

    tmp.id = obj.id;
    tmp.date = obj.date;
    tmp.title = obj.title;
    tmp.status = obj.status ? 1 : 0;

    if (obj.student_visit && !student_ids.includes(obj.student_id))
      tmp.visitCount += 1;

    if (!student_ids.includes(obj.student_id) && obj.student_id !== null) {
      tmp.students.push({
        id: obj.student_id,
        name: obj.student_name,
        visit: obj.student_visit ? true : false,
      });
      student_ids.push(obj.student_id);
    }

    if (!teacher_ids.includes(obj.teacher_id) && obj.teacher_id !== null) {
      tmp.teachers.push({
        id: obj.teacher_id,
        name: obj.teacher_name,
      });
      teacher_ids.push(obj.teacher_id);
    }

    if (index === res.length - 1)
      result.push({
        id: tmp.id,
        date: tmp.date,
        title: tmp.title,
        status: tmp.status,
        visitCount: tmp.visitCount,
        students: tmp.students,
        teachers: tmp.teachers,
      });
  });

  return result;
};

const getLessons = async (request, response) => {
  const params = request.query;

  try {
    const res = await pool.query(
      `
      SELECT
      /*+ PARALLEL(4) */
        lessons.id, 
        lessons.date, 
        lessons.title, 
        lessons.status,
        t.name AS teacher_name,
        t.id AS teacher_id,
        s.name AS student_name,
        s.id AS student_id,
        s.visit AS student_visit
      FROM lessons
      LEFT JOIN 
        (SELECT 
          teachers.name AS name, 
          lesson_teachers.lesson_id AS lesson_id, 
          teachers.id AS id 
        FROM lesson_teachers 
        JOIN teachers 
        ON lesson_teachers.teacher_id = teachers.id) t 
      ON lessons.id = t.lesson_id
      LEFT JOIN 
        (SELECT 
          students.name AS name, 
          students.id AS id, 
          lesson_students.visit AS visit,
          lesson_students.lesson_id AS lesson_id
        FROM lesson_students
        JOIN students 
        ON lesson_students.student_id = students.id) s
      ON lessons.id = s.lesson_id
      ORDER BY lessons.id
      `
    );
    const result = handleData(res.rows);
    response.status(200).json(result);
  } catch (err) {
    throw new Error(`Request failed with err ${err}`);
  }
};

const createLessons = (request, response) => {
  const { name, email } = request.body;

  pool.query(
    "INSERT INTO users (name, email) VALUES ($1, $2)",
    [name, email],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(201).send(`User added with ID: ${result.insertId}`);
    }
  );
};

module.exports = {
  getLessons,
  createLessons,
};
