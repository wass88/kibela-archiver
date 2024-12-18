import fs from "fs";
import path from "path";
import parseMD from "parse-md";
import { marked } from "marked";

const html_header = `<!DOCTYPE html>
<meta charset="utf-8">`;

function getNotes(dir: string): Archive {
  const notes_dir = path.join(dir, "notes");
  const files = fs.readdirSync(notes_dir);
  const notes = files.map((file) => {
    const filePath = path.join(notes_dir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    return parseNote(content);
  });
  return new Archive(notes);
}

function parseNote(md: string): Note {
  const { metadata, content } = parseMD(md);
  const html = marked.parse(content) as string;
  return new Note(metadata, html);
}

class Note {
  metadata: any;
  html: string;
  constructor(metadata: any, html: string) {
    this.metadata = metadata;
    this.html = html;
  }
  toHtml() {
    return this.html;
  }
  title() {
    return this.html.slice(4, this.html.indexOf("\n") - 5);
  }
}

class Archive {
  notes: Note[];
  constructor(notes: Note[]) {
    this.notes = notes;
  }
  archive(dir: string) {
    mkdir(dir);
    this.notes.forEach((note) => {
      this.save_note(dir, note);
    });

    this.save_index(dir);
  }
  save_note(dir: string, note: Note) {
    const { metadata, html } = note;
    const pat = metadata.path.split("/");
    const user = pat[1];
    const id = pat[2];
    const filename = `${id}.html`;
    const save_dir = path.join(dir, user);
    mkdir(save_dir);
    const save_path = path.join(save_dir, filename);
    console.log(`Saving ${metadata.id} to ${save_path}`);
    const page = `${html_header}
    ${this.note_header(note)}
    ${html}`;
    fs.writeFileSync(save_path, page);
  }
  save_index(dir: string) {
    const index_file = path.join(dir, "index.html");
    const contents = this.notes_by_date().map((note) => {
      const { metadata } = note;
      return `<li><a href="${metadata.path.slice(1)}.html">${note.title()} - ${
        metadata.author
      }</a></li>`;
    });
    const page = `${html_header}
    <h1> <a href="https://kmc.kibe.la">KMC Kibela</a> Archive </h1>
    <ul>${contents.join("")}</ul>`;

    fs.writeFileSync(index_file, page);
  }
  note_header(note: Note) {
    const { metadata } = note;
    return `<p>
       <a href="../index.html">KMC Kibela Archive</a><br>
       ${metadata.author} - ${metadata.published_at} - ${metadata.groups}
    </p>`;
  }
  notes_by_date() {
    return this.notes.sort((a, b) => {
      return a.metadata.published_at.localeCompare(b.metadata.published_at);
    });
  }
}
function mkdir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}
function copyDir(src: string, dst: string) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src).forEach((pat) => {
    const _src = path.join(src, pat);
    const _dst = path.join(dst, pat);
    const stat = fs.statSync(_src);
    if (stat && stat.isDirectory()) {
      copyDir(_src, _dst);
    } else {
      fs.copyFileSync(_src, _dst);
    }
  });
}

function run(src_dir: string, out_dir: string) {
  const archive = getNotes(src_dir);
  archive.archive(out_dir);
  copyDir(path.join(src_dir, "attachments"), path.join(out_dir, "attachments"));
}

// 引数からディレクトリを取得 node
const raw_dir = process.argv[2];
const out_dir = process.argv[3];
if (!raw_dir || !out_dir) {
  console.log("Usage: node index.ts <raw_dir> <out_dir>");
  process.exit(1);
}
run(raw_dir, out_dir);
