/* eslint-disable @typescript-eslint/no-require-imports */

let cachedContext;

function dynamicRequire(moduleName) {
  const req = eval("require");
  return req(moduleName);
}

function getServiceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (error) {
      return { __parseError: error instanceof Error ? error.message : "invalid_json" };
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n")
    };
  }

  return null;
}

function getAdminContext() {
  if (cachedContext !== undefined) {
    return cachedContext;
  }

  let appModule;
  let firestoreModule;

  try {
    appModule = dynamicRequire(["firebase-admin", "app"].join("/"));
    firestoreModule = dynamicRequire(["firebase-admin", "firestore"].join("/"));
  } catch {
    cachedContext = {
      enabled: false,
      reason: "firebase_admin_not_installed"
    };
    return cachedContext;
  }

  const serviceAccount = getServiceAccountFromEnv();
  if (serviceAccount && serviceAccount.__parseError) {
    cachedContext = {
      enabled: false,
      reason: `invalid_service_account_json:${serviceAccount.__parseError}`
    };
    return cachedContext;
  }

  if (!serviceAccount) {
    cachedContext = {
      enabled: false,
      reason: "missing_admin_credentials"
    };
    return cachedContext;
  }

  const { getApps, initializeApp, cert } = appModule;
  const { getFirestore } = firestoreModule;

  const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);

  cachedContext = {
    enabled: true,
    db
  };

  return cachedContext;
}

async function setDocument(collectionName, id, data) {
  const context = getAdminContext();
  if (!context.enabled) {
    return context;
  }

  await context.db.collection(collectionName).doc(id).set(data, { merge: true });
  return context;
}

async function batchSetDocuments(collectionName, items) {
  const context = getAdminContext();
  if (!context.enabled) {
    return context;
  }

  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const batch = context.db.batch();

    for (const item of slice) {
      const ref = context.db.collection(collectionName).doc(item.id);
      batch.set(ref, item.data, { merge: true });
    }

    await batch.commit();
  }

  return context;
}

module.exports = {
  getAdminContext,
  setDocument,
  batchSetDocuments
};
