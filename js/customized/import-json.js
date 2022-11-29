import * as THREE from "three";
import { RGBELoader } from "../../examples/jsm/loaders/RGBELoader.js";
import { AddObjectCommand } from "../commands/AddObjectCommand.js";
import { SetPositionCommand } from "../commands/SetPositionCommand.js";
import { SetRotationCommand } from "../commands/SetRotationCommand.js";
import { SetScaleCommand } from "../commands/SetScaleCommand.js";
import { SetValueCommand } from "../commands/SetValueCommand.js";

export const importJson = (json, editor) => {
  const { ar_type, lights, camera, scene, model } = JSON.parse(json);

  if (lights) {
    lights.forEach((l) => {
      if (l.type === "DirectionalLight") {
        const light = new THREE.DirectionalLight(l.color, l.intensity);
        light.name = "DirectionalLight";
        light.position.set(l.position.x, l.position.y, l.position.z);
        editor.execute(new AddObjectCommand(editor, light));
      }
    });
  }

  if (ar_type) {
    editor.data.arType = ar_type;
    editor.ui.arType.setValue(ar_type);
  }

  if (model.path && model.path !== "") {
    editor.data.modelPath = model.path;
    editor.ui.modelPathInput.setValue(model.path);

    (async () => {
      const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("../examples/js/libs/draco/gltf/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync(model.path);
      gltf.scene.name = "model";
      gltf.scene.animations.push(...gltf.animations);
      editor.execute(new AddObjectCommand(editor, gltf.scene));
      editor.execute(
        new SetPositionCommand(
          editor,
          gltf.scene,
          new THREE.Vector3(model.position.x, model.position.y, model.position.z)
        )
      );

      const newRotation = new THREE.Euler(
        model.rotation.x * THREE.MathUtils.DEG2RAD,
        model.rotation.y * THREE.MathUtils.DEG2RAD,
        model.rotation.z * THREE.MathUtils.DEG2RAD
      );

      editor.execute(new SetRotationCommand(editor, gltf.scene, newRotation));
      editor.execute(
        new SetScaleCommand(
          editor,
          gltf.scene,
          new THREE.Vector3(model.scale.x, model.scale.y, model.scale.z)
        )
      );

      if (scene.intensity) {
        editor.scene.traverse((m) => {
          if (m instanceof THREE.Mesh) {
            m.material.envMapIntensity = scene.intensity;
          }
        });
        editor.render();
      }

      if (scene.rotation) {
        editor.scene.rotation.y = THREE.MathUtils.degToRad(scene.rotation);
        editor.render();
        editor.data.hdrRotation = scene.rotation;
      }
    })();
  }

  if (scene.background && scene.background !== "") {
    editor.data.hdrPath = scene.background;
    editor.ui.hdrPathInput.setValue(scene.background);
    new RGBELoader().load(scene.background, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      editor.scene.environment = texture;
    });
  }

  if (scene.intensity) {
    editor.data.hdrIntensity = scene.intensity;
    editor.ui.hdrIntensity.setValue(scene.intensity);
  }

  if (scene.rotation) {
    editor.ui.hdrRotation.setValue(scene.rotation);
    editor.data.hdrRotation = scene.rotation;
  }

  if (scene.renderer) {
    const toneMappings = ["No", "Linear", "Reinhard", "Cineon", "ACESFilmic"];
    const index = toneMappings.indexOf(scene.renderer.toneMapping);
    editor.ui.toneMappingSelect.setValue(index);
    editor.ui.toneMappingExposure.setValue(scene.renderer.exposure);
    editor.ui.physicallyCorrectLightsBoolean.setValue(scene.lights.physical);

    window.renderer.toneMapping = index;
    window.renderer.toneMappingExposure = scene.renderer.exposure;
    window.renderer.physicallyCorrectLights = scene.lights.physical;
  }

  if (camera) {
    // fov
    editor.ui.objectFov.setValue(camera.fov);
    editor.ui.objectNear.setValue(camera.near);
    editor.ui.objectFar.setValue(camera.far);

    editor.execute(new SetValueCommand(editor, editor.camera, "fov", camera.fov));
    editor.execute(new SetValueCommand(editor, editor.camera, "near", camera.near));
    editor.execute(new SetValueCommand(editor, editor.camera, "far", camera.far));

    editor.execute(
      new SetPositionCommand(
        editor,
        editor.camera,
        new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)
      )
    );
    editor.camera.lookAt(0, 0, 0);
    editor.camera.updateProjectionMatrix();
  }
};
