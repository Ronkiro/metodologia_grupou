
// -i = nome do arquivo de entrada, ou seja, a turma
// -o = diretório em que os resultados irão ser gerados
// -q = quantidade máxima de integrantes que um grupo pode possuir
// -s = sufixo que irá ser adicionado ao final do nome do arquivo gerado, com base no parâmetro -i ficaria: 123_1.json
// node sln1.js -i turmas/123.json -o grupos -q 6 -s 1

var argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const fs = require('fs');

/* Helper methods */
Array.prototype.group = function (n) {
  /* creates groups of arrays by n slices */
  function groupArr(data, n) {
    var group = [];
    for (var i = 0, j = 0; i < data.length; i++) {
      if (i >= n && i % n === 0)
        j++;
      group[j] = group[j] || [];
      group[j].push(data[i])
    }
    return group;
  }
  return groupArr(this, n);
}

const output_path = argv.o;
const max_members = argv.q;
const file_suffix = argv.s;
const input_path = argv.i;
let classroom;

/* throws exc if DEBUG is set, else show friendly message and exits */
const showErr = (exc, msg) => {
  if (process.env.DEBUG)
    throw err;
  console.error(msg);
  process.exit(-1);
}

try {
  console.info(`Lendo o arquivo em "${input_path}"`)
  classroom = JSON.parse(fs.readFileSync(input_path));
} catch (err) {
  showErr(err, `Ocorreu um erro ao ler o diretório "${input_path}" fornecido no argumento "-i"`);
}

/* validate the file */
if (!classroom.hasOwnProperty("hardskills_atividade") ||
  !classroom.hasOwnProperty("analise") ||
  !classroom.hasOwnProperty("alunos"))
  showErr(new Error("Input file is invalid."), "Erro ao processar o arquivo, verifique se o mesmo contém um formato válido.");

const weights = classroom.hardskills_atividade;
const students = classroom.alunos;

console.info("Arquivo processado com sucesso.");

// TODO LOGIC
console.info("Calculando grupos...");
const available_weights = Object.keys(weights);
const studentsByWeight = students.map(student => {
  let gradeByWeight = [];
  available_weights.forEach(weight => {
    gradeByWeight.push(student.hardskills[weight].nota * weights[weight].peso)
  });

  studentTotal = gradeByWeight.reduce((a, b) => a + b,);

  return ({
    ...student,
    total: studentTotal
  })
}).sort((a, b) => a.total - b.total);

const studentsByWeightReversed = [...studentsByWeight].reverse();
const studentsByGroup = [];
for (let i = 0; i < studentsByWeightReversed.length; i++) {
  if (studentsByGroup.includes(studentsByWeightReversed[i])) { break; }

  studentsByGroup.push(studentsByWeightReversed[i]);
  studentsByGroup.push(studentsByWeight[i]);
}
let groups;
let studentsPerGroup = max_members;

if (max_members % 2 == 0 && students.length % 2 == 0) {
  groups = studentsByGroup.group(max_members);
} else {
  for (let i = max_members; i > 0; i--) {
    if (students.length % i == 0 && i != 1) { // != cause it's always 0
      studentsPerGroup = i;
      break;
    }
  }
  groups = studentsByGroup.group(studentsPerGroup);
}

const groupsWithoutRecommendedMembers = groups.filter(group => group.length < studentsPerGroup)
  .flatMap(group => group)
  .sort((a, b) => a.total - b.total)
  .reverse();

groups = groups.filter(group => group.length >= studentsPerGroup)

if (groupsWithoutRecommendedMembers.length > 0) {
  const groupsScore = groups.map(
    (e, index) => ({
      idx: index,
      value: e.reduce((a, b) => {
        return a + b.total
      }, 0)
    })
  ).sort((a, b) => a.value - b.value);
  const groupsToAdd = groupsScore.slice(0, groupsWithoutRecommendedMembers.length).map(e => e.idx);
  groupsWithoutRecommendedMembers.forEach((groupWithout, idx) => groups[groupsToAdd[idx]].push(groupWithout))
}

let grupos = {};
groups.forEach((group, index) => grupos[`grupo_${index + 1}`] = group);
const response = {
  grupos,
  hardskills_atividade: weights,
}

let filename = argv.i.split("/")[1].split(".json")[0]

fs.writeFile(
  `${output_path}/${filename}_${file_suffix}.json`,
  JSON.stringify(response, null, 2),
  function (err) {
    if (err) throw err;
    console.log('complete');
  }
);
console.info("total de grupos:", groups.length);
console.info("total de estudantes: ", students.length);
