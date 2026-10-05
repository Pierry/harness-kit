// Export the internal call graph of a Joern CPG as JSONL, one line per method:
// {"m": fullName, "n": name, "f": file, "l": line, "c": [callee fullNames]}
//
// Usage: joern --script export_callgraph.sc --param cpgPath=/x/cpg.bin --param out=/x/cg.jsonl
// Read by .claude/scripts/graph.py index-code, which loads it into the graph.

import java.io.{BufferedWriter, FileWriter}

@main def exec(cpgPath: String, out: String) = {
  importCpg(cpgPath)

  def esc(s: String): String =
    Option(s).getOrElse("")
      .replace("\\", "\\\\").replace("\"", "\\\"")
      .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")

  val w = new BufferedWriter(new FileWriter(out))
  var n = 0
  cpg.method.internal.foreach { m =>
    val callees = m.call.methodFullName.distinct.l
    val cs = callees.map(c => "\"" + esc(c) + "\"").mkString(",")
    val line = m.lineNumber.map(_.toString).getOrElse("-1")
    w.write("{\"m\":\"" + esc(m.fullName) + "\",\"n\":\"" + esc(m.name) +
      "\",\"f\":\"" + esc(m.filename) + "\",\"l\":" + line + ",\"c\":[" + cs + "]}\n")
    n += 1
  }
  w.close()
  println(s"### EXPORTED methods=$n out=$out")
}
