/* 작지 — 엑셀(.xlsx) 파일 작성기. 외부 라이브러리 없이 필요한 만큼만: 여러 시트, 병합, 글자 모양(굵게·배경·테두리·줄바꿈), 열 너비·행 높이, 그림(PNG·JPEG), 가로 A4 인쇄 설정.
   브라우저(app.html)와 Node(scripts/build-templates.mjs, tests)에서 같이 씀 (둘 다 globalThis.Xlsx).
   사용: Xlsx.build({ sheets: [{ name, cols: [너비…], rows: [[셀…], …], rowHeights: {행번호(1부터): 높이}, merges: ["A1:C1"], images: [{ data: Uint8Array, type: "png"|"jpeg", col, row, w, h }] }] }) → Uint8Array
   셀: 문자열·숫자, 또는 { v, f: "수식(=없이)", b: 굵게, fill: "rrggbb", al: "left|center|right", va: "top|center", wrap: false, bd: false(테두리 없음), sz: 글자 크기, color: "rrggbb" } */
(function () {
  var enc = new TextEncoder();
  var esc = function (s) { return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var colName = function (i) { var s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  var colIndex = function (s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + s.charCodeAt(i) - 64; return n - 1; };
  var parseRef = function (r) { var m = /^([A-Z]+)(\d+)$/.exec(r); return { c: colIndex(m[1]), r: +m[2] - 1 }; };

  /* ---- ZIP (저장만, 압축 없음) ---- */
  var crcTable = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  var crc32 = function (b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    var parts = [], central = [], offset = 0;
    var u16 = function (v) { return [v & 255, (v >> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]; };
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push({ crc: crc, size: data.length, name: name, offset: offset });
      offset += head.length + name.length + data.length;
    });
    var cdStart = offset, cd = [];
    central.forEach(function (e) {
      var h = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(e.crc), u32(e.size), u32(e.size), u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset));
      cd.push(new Uint8Array(h), e.name); offset += h.length + e.name.length;
    });
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(offset - cdStart), u32(cdStart), u16(0)));
    var all = parts.concat(cd, [end]), total = all.reduce(function (a, p) { return a + p.length; }, 0), out = new Uint8Array(total), o = 0;
    all.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }

  /* ---- 글자 모양(스타일) 등록: 같은 모양은 하나로 ---- */
  function Styles() {
    this.fonts = ['<font><sz val="10"/><name val="Malgun Gothic"/><family val="2"/></font>'];
    this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', '<border><left style="thin"><color rgb="FF1D1D1B"/></left><right style="thin"><color rgb="FF1D1D1B"/></right><top style="thin"><color rgb="FF1D1D1B"/></top><bottom style="thin"><color rgb="FF1D1D1B"/></bottom><diagonal/></border>'];
    this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']; this.map = {}; this.pool = {};
  }
  Styles.prototype.idx = function (list, xml) { var i = list.indexOf(xml); if (i < 0) { list.push(xml); i = list.length - 1; } return i; };
  Styles.prototype.get = function (c) {
    if (!c || typeof c !== "object") c = {};
    var key = JSON.stringify([c.b, c.fill, c.al, c.va, c.wrap, c.bd, c.sz, c.color]);
    if (this.map[key] != null) return this.map[key];
    var font = '<font>' + (c.b ? "<b/>" : "") + '<sz val="' + (c.sz || 10) + '"/>' + (c.color ? '<color rgb="FF' + c.color + '"/>' : "") + '<name val="Malgun Gothic"/><family val="2"/></font>';
    var fill = c.fill ? '<fill><patternFill patternType="solid"><fgColor rgb="FF' + c.fill + '"/><bgColor indexed="64"/></patternFill></fill>' : null;
    var f = this.idx(this.fonts, font), fi = fill ? this.idx(this.fills, fill) : 0, bo = c.bd === false ? 0 : 1;
    var xf = '<xf numFmtId="0" fontId="' + f + '" fillId="' + fi + '" borderId="' + bo + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="' + (c.al || "left") + '" vertical="' + (c.va || "center") + '"' + (c.wrap === false ? "" : ' wrapText="1"') + "/></xf>";
    var i = this.idx(this.xfs, xf); this.map[key] = i; return i;
  };
  Styles.prototype.xml = function () {
    var cat = function (tag, list) { return "<" + tag + ' count="' + list.length + '">' + list.join("") + "</" + tag + ">"; };
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + cat("fonts", this.fonts) + cat("fills", this.fills) + cat("borders", this.borders)
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' + cat("cellXfs", this.xfs) + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  };

  /* ---- 시트 ---- */
  function sheetXml(sh, st, hasDrawing) {
    var cells = {}, maxR = 0, maxC = 0, merges = (sh.merges || []).map(function (m) { var p = m.split(":"); return { a: parseRef(p[0]), b: parseRef(p[1] || p[0]), ref: m }; });
    (sh.rows || []).forEach(function (row, r) { (row || []).forEach(function (cell, c) { if (cell == null) return; cells[r + "," + c] = cell; if (r > maxR) maxR = r; if (c > maxC) maxC = c; }); });
    merges.forEach(function (m) {   // 병합 칸 전체에 같은 모양을 깔아 테두리가 빠지지 않게
      var top = cells[m.a.r + "," + m.a.c], base = top && typeof top === "object" ? { b: top.b, fill: top.fill, al: top.al, va: top.va, wrap: top.wrap, bd: top.bd, sz: top.sz, color: top.color } : {};
      for (var r = m.a.r; r <= m.b.r; r++) for (var c = m.a.c; c <= m.b.c; c++) if (cells[r + "," + c] == null) { cells[r + "," + c] = Object.assign({ v: "" }, base); if (r > maxR) maxR = r; if (c > maxC) maxC = c; }
    });
    var out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'];
    out.push('<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/>');
    if (sh.cols && sh.cols.length) out.push("<cols>" + sh.cols.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols>");
    out.push("<sheetData>");
    for (var r = 0; r <= maxR; r++) {
      var ht = sh.rowHeights && sh.rowHeights[r + 1], rowCells = [];
      for (var c = 0; c <= maxC; c++) {
        var cell = cells[r + "," + c]; if (cell == null) continue;
        var obj = typeof cell === "object" ? cell : { v: cell }, v = obj.v, ref = colName(c) + (r + 1), s = st.get(typeof cell === "object" ? obj : {});
        if (typeof cell !== "object") s = st.get({ bd: false });
        if (obj.f) rowCells.push('<c r="' + ref + '" s="' + s + '"><f>' + esc(obj.f) + '</f><v>' + (typeof v === "number" ? v : 0) + "</v></c>");   // 수식 (값은 미리 계산해 넣음)
        else if (typeof v === "number" && isFinite(v)) rowCells.push('<c r="' + ref + '" s="' + s + '"><v>' + v + "</v></c>");
        else if (v === "" || v == null) rowCells.push('<c r="' + ref + '" s="' + s + '"/>');
        else rowCells.push('<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + "</t></is></c>");
      }
      out.push('<row r="' + (r + 1) + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : "") + ">" + rowCells.join("") + "</row>");
    }
    out.push("</sheetData>");
    if (merges.length) out.push('<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m.ref + '"/>'; }).join("") + "</mergeCells>");
    out.push('<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    if (hasDrawing) out.push('<drawing r:id="rId1"/>');
    out.push("</worksheet>");
    return out.join("");
  }
  var EMU = 9525;
  function drawingXml(images) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + images.map(function (im, i) {
        var cx = Math.round(im.w * EMU), cy = Math.round(im.h * EMU);
        return '<xdr:oneCellAnchor><xdr:from><xdr:col>' + im.col + '</xdr:col><xdr:colOff>' + Math.round((im.dx || 0) * EMU) + '</xdr:colOff><xdr:row>' + im.row + '</xdr:row><xdr:rowOff>' + Math.round((im.dy || 0) * EMU) + '</xdr:rowOff></xdr:from><xdr:ext cx="' + cx + '" cy="' + cy + '"/>'
          + '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (i + 2) + '" name="그림 ' + (i + 1) + '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId' + (i + 1) + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
          + '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>';
      }).join("") + "</xdr:wsDr>";
  }

  function build(book) {
    var st = new Styles(), files = [], sheets = book.sheets, media = 0, hasPng = false, hasJpg = false, overrides = [];
    var sheetNames = sheets.map(function (s) { return String(s.name).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31) || "Sheet"; });
    var drawN = 0;
    sheets.forEach(function (sh, i) {
      var imgs = sh.images || [], hasD = imgs.length > 0;
      files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: sheetXml(sh, st, hasD) });
      overrides.push('<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
      if (hasD) {
        drawN++;
        files.push({ name: "xl/worksheets/_rels/sheet" + (i + 1) + ".xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing' + drawN + '.xml"/></Relationships>' });
        files.push({ name: "xl/drawings/drawing" + drawN + ".xml", data: drawingXml(imgs) });
        var rels = imgs.map(function (im, k) {
          media++; var ext = im.type === "jpeg" ? "jpeg" : "png"; if (ext === "png") hasPng = true; else hasJpg = true;
          files.push({ name: "xl/media/image" + media + "." + ext, data: im.data });
          return '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image' + media + "." + ext + '"/>';
        }).join("");
        files.push({ name: "xl/drawings/_rels/drawing" + drawN + ".xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + "</Relationships>" });
        overrides.push('<Override PartName="/xl/drawings/drawing' + drawN + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
      }
    });
    files.unshift({ name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + (hasPng ? '<Default Extension="png" ContentType="image/png"/>' : "") + (hasJpg ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : "")
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + overrides.join("") + "</Types>" });
    files.push({ name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
    files.push({ name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheetNames.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" });
    files.push({ name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheetNames.map(function (n, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("")
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    files.push({ name: "xl/styles.xml", data: st.xml() });   // 스타일은 시트를 다 만든 뒤에야 완성되므로 마지막에 넣음
    return zip(files);
  }
  var api = { build: build, colName: colName, _crc32: crc32 };
  globalThis.Xlsx = api;   // 브라우저에서는 <script>, Node에서는 import "…/xlsx.js" 한 뒤 globalThis.Xlsx
})();
