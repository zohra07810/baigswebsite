// sizesLogic.js
export async function loadSizesMarker(markerEntity, contentDiv, markerMenu) {
  let currentModel = null;
  const preloadedModels = {};

  function showModelDescription(modelData, variantName, categoryName) {
    const oldDesc = document.getElementById('model-desc-container');
    if (oldDesc) oldDesc.remove();

    const container = document.createElement('div');
    container.id = 'model-desc-container';

    const desc = document.createElement('p');
    desc.textContent = modelData.description || `Viewing ${variantName} from ${categoryName}`;
    container.appendChild(desc);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.onclick = () => showVariants(categoryName);
    container.appendChild(backBtn);

    contentDiv.appendChild(container);
  }

  function showMainCategories() {
    contentDiv.innerHTML = '<h3>Select Category:</h3>';
    const categories = markerMenu[markerEntity.dataset.index].categories;

    Object.keys(categories).forEach(categoryName => {
      const btn = document.createElement('button');
      btn.textContent = categoryName;
      btn.onclick = () => showVariants(categoryName);
      contentDiv.appendChild(btn);
    });
  }

  function showVariants(categoryName) {
    contentDiv.innerHTML = `<h3>${categoryName}</h3>`;
    const variants = markerMenu[markerEntity.dataset.index].categories[categoryName].variants;

    Object.keys(variants).forEach(variantName => {
      const btn = document.createElement('button');
      btn.textContent = variantName;
      btn.onclick = () => loadModel(variants[variantName], categoryName, variantName);
      contentDiv.appendChild(btn);
    });

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.onclick = showMainCategories;
    contentDiv.appendChild(backBtn);
  }
function loadModel(modelData, categoryName, variantName) {
  const markerKey = markerEntity.dataset.id || `marker${markerEntity.dataset.index}`;
  const modelKey = `${markerKey}_${categoryName}_${variantName}`;

  // Hide all other models
  Object.keys(preloadedModels).forEach(key => {
    preloadedModels[key].object3D.visible = false;
  });
  contentDiv.innerHTML = '';

  // Show cached model if available
  if (preloadedModels[modelKey]) {
    preloadedModels[modelKey].object3D.visible = true;
    currentModel = preloadedModels[modelKey];
    showModelDescription(modelData, variantName, categoryName);
    addChangeViewButton();
    preloadOtherVariants(categoryName, variantName);
    return;
  }

  // --- CIRCULAR LOADER ---
  const loaderWrapper = document.createElement("div");
  loaderWrapper.style.cssText = `
    width: 90px;
    height: 90px;
    margin: 15px auto;
    position: relative;
  `;

  const baseCircle = document.createElement("div");
  baseCircle.style.cssText = `
    width: 100%;
    height: 100%;
    border: 6px solid #ccc;
    border-radius: 50%;
    box-sizing: border-box;
    position: absolute;
  `;

  const progressCircle = document.createElement("div");
  progressCircle.style.cssText = `
    width: 100%;
    height: 100%;
    border-radius: 50%;
    position: absolute;
    background: conic-gradient(#4caf50 0deg, transparent 0deg);
    transition: background 0.12s linear;
  `;

  const percentText = document.createElement("div");
  percentText.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    font-weight: bold;
    color: white;
    text-align: center;
  `;
  percentText.textContent = "0%";

  loaderWrapper.appendChild(baseCircle);
  loaderWrapper.appendChild(progressCircle);
  loaderWrapper.appendChild(percentText);

  contentDiv.textContent = "Loading 3D model...";
  contentDiv.appendChild(loaderWrapper);

  // --- Create entity ---
  const entity = document.createElement('a-entity');
  entity.setAttribute('scale', modelData.scale || '0.2 0.2 0.2');
  entity.setAttribute('position', modelData.position || '0 0 0');
  entity.object3D.visible = false;
  markerEntity.appendChild(entity);

  // --- Loader setup ---
  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
  }

  loader.load(
    modelData.path,
    gltf => {
      entity.setObject3D('mesh', gltf.scene);
      entity.object3D.visible = true;
      preloadedModels[modelKey] = entity;
      currentModel = entity;

      percentText.textContent = "100%";
      progressCircle.style.background = `conic-gradient(#4caf50 360deg, transparent 360deg)`;

      setTimeout(() => {
        loaderWrapper.remove();
        contentDiv.innerHTML = '';
        showModelDescription(modelData, variantName, categoryName);
        addChangeViewButton();

        // Optional: check for glitches
        const visibleModels = Object.values(preloadedModels).filter(m => m.object3D.visible);
        if (!currentModel || !currentModel.object3D.visible || visibleModels.length > 1) {
          let overlay = document.createElement('div');
          overlay.id = 'refresh-overlay';
          overlay.style.cssText = `
            position: fixed;
            top:0; left:0;
            width:100%; height:100%;
            background-color: rgba(0,0,0,0.8);
            color:white; display:flex;
            justify-content:center;
            align-items:center;
            font-size:24px; z-index:9999;
          `;
          overlay.textContent = "There's something wrong, we will refresh...";
          document.body.appendChild(overlay);
          setTimeout(() => location.reload(), 3000);
        }
      }, 400);

      // Preload other variants silently
      preloadOtherVariants(categoryName, variantName);
    },
    xhr => {
      if (xhr.lengthComputable) {
        let percent = Math.min((xhr.loaded / xhr.total) * 100, 100);
        percentText.textContent = Math.round(percent) + "%";
        progressCircle.style.background =
          `conic-gradient(#4caf50 ${(percent / 100) * 360}deg, transparent ${(percent / 100) * 360}deg)`;
      }
    },
    err => {
      console.error('Failed to load model', err);
      contentDiv.innerHTML = '❌ Failed to load 3D model';
    }
  );
}

// --- Preload other variants function ---
function preloadOtherVariants(categoryName, activeVariantName) {
  const variants = markerMenu[markerEntity.dataset.index].categories[categoryName].variants;
  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
  }

  Object.keys(variants).forEach(vName => {
    if (vName !== activeVariantName) {
      const key = `${markerEntity.dataset.id || `marker${markerEntity.dataset.index}`}_${categoryName}_${vName}`;
      if (!preloadedModels[key]) {
        const vData = variants[vName];
        const e = document.createElement('a-entity');
        e.setAttribute('scale', vData.scale || '0.2 0.2 0.2');
        e.setAttribute('position', vData.position || '0 0 0');
        e.object3D.visible = false;
        markerEntity.appendChild(e);

        loader.load(
          vData.path,
          gltf => { e.setObject3D('mesh', gltf.scene); preloadedModels[key] = e; },
          undefined,
          err => console.warn(`Failed to preload ${key}`, err)
        );
      }
    }
  });
}


  function addChangeViewButton() {
    if (!currentModel) return;
    const container = document.getElementById('change-view-container');
    if (!container) return;
    container.innerHTML = '';

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'Change View';
    viewBtn.style.padding = '8px 12px';
    viewBtn.style.fontSize = '16px';
    viewBtn.style.backgroundColor = '#FFD700';
    viewBtn.style.color = '#000';
    viewBtn.style.border = 'none';
    viewBtn.style.borderRadius = '5px';
    viewBtn.style.cursor = 'pointer';

    const originalPos = currentModel.getAttribute('position') || {x:0,y:0,z:0};
    const views = [
    { rotation: { x: 0, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y, z: originalPos.z } },
    { rotation: { x: -80, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: -50, y: 0, z: 0 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: 0, y: 0, z: 90 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    { rotation: { x: 0, y: 0, z: 180 }, position: { x: originalPos.x, y: originalPos.y + 1, z: originalPos.z } },
    ];
    let currentViewIndex = 0;

    viewBtn.onclick = () => {
      currentViewIndex = (currentViewIndex + 1) % views.length;
      const view = views[currentViewIndex];
      currentModel.setAttribute('rotation', view.rotation);
      currentModel.setAttribute('position', view.position);
    };

    container.appendChild(viewBtn);
  }

  // Start
  showMainCategories();

  return { loadModel, showMainCategories, showVariants };
}



