import * as THREE from "three";

import { zipSync, strToU8 } from "three/addons/libs/fflate.module.js";

import { UIPanel, UIRow, UIHorizontalRule } from "../libs/ui.js";

import { importJson } from "./import-json.js";

function MenubarFile(editor) {
  const config = editor.config;
  const strings = editor.strings;
  const container = new UIPanel();
  container.setClass("menu");

  const title = new UIPanel();
  title.setClass("title");
  title.setTextContent(strings.getKey("menubar/file"));
  container.add(title);

  const options = new UIPanel();
  options.setClass("options");
  container.add(options);

  // New

  let option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/new"));
  option.onClick(function () {
    window.location.reload();
    editor.clear();
  });
  options.add(option);

  options.add(new UIHorizontalRule());

  // Import

  const form = document.createElement("form");
  form.style.display = "none";
  document.body.appendChild(form);

  const fileInput = document.createElement("input");
  fileInput.multiple = true;
  fileInput.type = "file";
  fileInput.addEventListener("change", function () {
    editor.loader.loadFiles(fileInput.files);
    form.reset();
  });
  form.appendChild(fileInput);

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/import"));
  option.onClick(function () {
    fileInput.click();
  });
  options.add(option);

  /* Import JSON */

  const form1 = document.createElement("form");
  form1.style.display = "none";
  document.body.appendChild(form1);

  const fileInput1 = document.createElement("input");
  fileInput1.multiple = true;
  fileInput1.type = "file";
  fileInput1.addEventListener("change", function () {
    const blob = new Blob([fileInput1.files[0]], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    new THREE.FileLoader().load(url, (json) => {
      importJson(json, editor);
    });
    form1.reset();
  });
  form1.appendChild(fileInput1);
  option = new UIRow();
  option.setClass("option");
  option.setTextContent("Import JSON");
  option.onClick(function () {
    fileInput1.click();
  });
  //   options.add(option);

  /* Export JSON */

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export"));
  const toneMappings = {
    0: "No",
    1: "Linear",
    2: "Reinhard",
    3: "Cineon",
    4: "ACESFilmic",
  };
  option.onClick(function () {
    let data = {
      ar_type: editor.data.arType,
      lights: [],
      camera: {
        fov: editor.camera.fov,
        near: editor.camera.near,
        far: editor.camera.far,
        position: {
          ...editor.camera.position,
        },
      },
      scene: {
        background: editor.data.hdrPath,
        rotation: editor.data.hdrRotation,
        intensity: editor.data.hdrIntensity,
        renderer: {
          toneMapping: toneMappings[window.renderer.toneMapping],
          exposure: window.renderer.toneMappingExposure,
        },
        lights: {
          physical: window.renderer.physicallyCorrectLights,
        },
      },
    };

    const formatData = (s) => ({
      x: parseFloat(s.x).toFixed(2),
      y: parseFloat(s.y).toFixed(2),
      z: parseFloat(s.z).toFixed(2),
    });

    editor.scene.children.forEach((m) => {
      if (m.type.includes("Light")) {
        data.lights.push({
          type: m.type,
          intensity: m.intensity,
          color: "#" + m.color.getHexString(),
          position: { ...m.position },
          target: m.target ? true : false,
          targetPosition: m.target ? { ...m.target.position } : null,
        });
      } else if (!m.type.includes("Camera")) {
        console.log(m.position);
        data["model"] = {
          path: editor.data.modelPath,
          position: formatData(m.position),
          rotation: formatData(m.rotation),
          scale: formatData(m.scale),
        };
      }
    });
    const text = JSON.stringify(data, undefined, 4);
    console.log("JSON To Export: \n", text);
    var element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", "scene.json");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  });
  options.add(option);

  //

  options.add(new UIHorizontalRule());

  // Export Geometry

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/geometry"));
  option.onClick(function () {
    const object = editor.selected;

    if (object === null) {
      alert("No object selected.");
      return;
    }

    const geometry = object.geometry;

    if (geometry === undefined) {
      alert("The selected object doesn't have geometry.");
      return;
    }

    let output = geometry.toJSON();

    try {
      output = JSON.stringify(output, null, "\t");
      output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, "$1");
    } catch (e) {
      output = JSON.stringify(output);
    }

    saveString(output, "geometry.json");
  });
  options.add(option);

  // Export Object

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/object"));
  option.onClick(function () {
    const object = editor.selected;

    if (object === null) {
      alert("No object selected");
      return;
    }

    let output = object.toJSON();

    try {
      output = JSON.stringify(output, null, "\t");
      output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, "$1");
    } catch (e) {
      output = JSON.stringify(output);
    }

    saveString(output, "model.json");
  });
  options.add(option);

  // Export Scene

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/scene"));
  option.onClick(function () {
    let output = editor.scene.toJSON();

    try {
      output = JSON.stringify(output, null, "\t");
      output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, "$1");
    } catch (e) {
      output = JSON.stringify(output);
    }

    saveString(output, "scene.json");
  });
  options.add(option);

  //

  options.add(new UIHorizontalRule());

  // Export DAE

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/dae"));
  option.onClick(async function () {
    const { ColladaExporter } = await import("three/addons/exporters/ColladaExporter.js");

    const exporter = new ColladaExporter();

    exporter.parse(editor.scene, function (result) {
      saveString(result.data, "scene.dae");
    });
  });
  options.add(option);

  // Export DRC

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/drc"));
  option.onClick(async function () {
    const object = editor.selected;

    if (object === null || object.isMesh === undefined) {
      alert("No mesh selected");
      return;
    }

    const { DRACOExporter } = await import("three/addons/exporters/DRACOExporter.js");

    const exporter = new DRACOExporter();

    const options = {
      decodeSpeed: 5,
      encodeSpeed: 5,
      encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
      quantization: [16, 8, 8, 8, 8],
      exportUvs: true,
      exportNormals: true,
      exportColor: object.geometry.hasAttribute("color"),
    };

    // TODO: Change to DRACOExporter's parse( geometry, onParse )?
    const result = exporter.parse(object, options);
    saveArrayBuffer(result, "model.drc");
  });
  options.add(option);

  // Export GLB

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/glb"));
  option.onClick(async function () {
    const scene = editor.scene;
    const animations = getAnimations(scene);

    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      function (result) {
        saveArrayBuffer(result, "scene.glb");
      },
      undefined,
      { binary: true, animations: animations }
    );
  });
  options.add(option);

  // Export GLTF

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/gltf"));
  option.onClick(async function () {
    const scene = editor.scene;
    const animations = getAnimations(scene);

    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      function (result) {
        saveString(JSON.stringify(result, null, 2), "scene.gltf");
      },
      undefined,
      { animations: animations }
    );
  });
  options.add(option);

  // Export OBJ

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/obj"));
  option.onClick(async function () {
    const object = editor.selected;

    if (object === null) {
      alert("No object selected.");
      return;
    }

    const { OBJExporter } = await import("three/addons/exporters/OBJExporter.js");

    const exporter = new OBJExporter();

    saveString(exporter.parse(object), "model.obj");
  });
  options.add(option);

  // Export PLY (ASCII)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/ply"));
  option.onClick(async function () {
    const { PLYExporter } = await import("three/addons/exporters/PLYExporter.js");

    const exporter = new PLYExporter();

    exporter.parse(editor.scene, function (result) {
      saveArrayBuffer(result, "model.ply");
    });
  });
  options.add(option);

  // Export PLY (Binary)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/ply_binary"));
  option.onClick(async function () {
    const { PLYExporter } = await import("three/addons/exporters/PLYExporter.js");

    const exporter = new PLYExporter();

    exporter.parse(
      editor.scene,
      function (result) {
        saveArrayBuffer(result, "model-binary.ply");
      },
      { binary: true }
    );
  });
  options.add(option);

  // Export STL (ASCII)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/stl"));
  option.onClick(async function () {
    const { STLExporter } = await import("three/addons/exporters/STLExporter.js");

    const exporter = new STLExporter();

    saveString(exporter.parse(editor.scene), "model.stl");
  });
  options.add(option);

  // Export STL (Binary)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/stl_binary"));
  option.onClick(async function () {
    const { STLExporter } = await import("three/addons/exporters/STLExporter.js");

    const exporter = new STLExporter();

    saveArrayBuffer(exporter.parse(editor.scene, { binary: true }), "model-binary.stl");
  });
  options.add(option);

  // Export USDZ

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/export/usdz"));
  option.onClick(async function () {
    const { USDZExporter } = await import("three/addons/exporters/USDZExporter.js");

    const exporter = new USDZExporter();

    saveArrayBuffer(await exporter.parse(editor.scene, { binary: true }), "model.usdz");
  });
  options.add(option);

  //

  options.add(new UIHorizontalRule());

  // Publish

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/publish"));
  option.onClick(function () {
    const toZip = {};

    //

    let output = editor.toJSON();
    output.metadata.type = "App";
    delete output.history;

    output = JSON.stringify(output, null, "\t");
    output = output.replace(/[\n\t]+([\d\.e\-\[\]]+)/g, "$1");

    toZip["app.json"] = strToU8(output);

    //

    const title = config.getKey("project/title");

    const manager = new THREE.LoadingManager(function () {
      const zipped = zipSync(toZip, { level: 9 });

      const blob = new Blob([zipped.buffer], { type: "application/zip" });

      save(blob, (title !== "" ? title : "untitled") + ".zip");
    });

    const loader = new THREE.FileLoader(manager);
    loader.load("js/libs/app/index.html", function (content) {
      content = content.replace("<!-- title -->", title);

      const includes = [];

      content = content.replace("<!-- includes -->", includes.join("\n\t\t"));

      let editButton = "";

      if (config.getKey("project/editable")) {
        editButton = [
          "			let button = document.createElement( 'a' );",
          "			button.href = 'https://threejs.org/editor/#file=' + location.href.split( '/' ).slice( 0, - 1 ).join( '/' ) + '/app.json';",
          "			button.style.cssText = 'position: absolute; bottom: 20px; right: 20px; padding: 10px 16px; color: #fff; border: 1px solid #fff; border-radius: 20px; text-decoration: none;';",
          "			button.target = '_blank';",
          "			button.textContent = 'EDIT';",
          "			document.body.appendChild( button );",
        ].join("\n");
      }

      content = content.replace("\t\t\t/* edit button */", editButton);

      toZip["index.html"] = strToU8(content);
    });
    loader.load("js/libs/app.js", function (content) {
      toZip["js/app.js"] = strToU8(content);
    });
    loader.load("../build/three.module.js", function (content) {
      toZip["js/three.module.js"] = strToU8(content);
    });
    loader.load("../examples/jsm/webxr/VRButton.js", function (content) {
      toZip["js/VRButton.js"] = strToU8(content);
    });
  });
  options.add(option);

  //

  const link = document.createElement("a");
  function save(blob, filename) {
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }

    link.href = URL.createObjectURL(blob);
    link.download = filename || "data.json";
    link.dispatchEvent(new MouseEvent("click"));
  }

  function saveArrayBuffer(buffer, filename) {
    save(new Blob([buffer], { type: "application/octet-stream" }), filename);
  }

  function saveString(text, filename) {
    save(new Blob([text], { type: "text/plain" }), filename);
  }

  function getAnimations(scene) {
    const animations = [];

    scene.traverse(function (object) {
      animations.push(...object.animations);
    });

    return animations;
  }

  return container;
}

export { MenubarFile };