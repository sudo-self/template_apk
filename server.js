const express = require('express');
const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// --- Utility Functions ---

/**
 * Executes a shell command and returns a Promise.
 * @param {string} command - The shell command to execute.
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        // Reject with a detailed error message
        return reject(new Error(`Command failed: ${command}\n${error.message}\nStderr: ${stderr}`));
      }
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      resolve(stdout);
    });

    // Pipe stdout and stderr to the console for real-time logging (useful for long builds)
    // Note: Cloud Run logs these outputs.
    process.stdout.pipe(process.stdout);
    process.stderr.pipe(process.stderr);
  });
}

/**
 * Updates the twa-manifest.json with new values provided by the user.
 * @param {string} host - The new start URL (host).
 * @param {string} launcherName - The new application name.
 */
async function updateManifest(host, launcherName) {
  try {
    const manifestPath = path.join(__dirname, 'twa-manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Update the critical fields
    manifest.start_url = host;
    manifest.name = launcherName;
    manifest.short_name = launcherName;
    // The launcher name is also often set as the package name prefix for consistency
    manifest.package_name = `com.twa.${launcherName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('twa-manifest.json updated successfully.');

  } catch (error) {
    console.error('Error updating manifest:', error);
    throw new Error('Failed to update twa-manifest.json');
  }
}

// --- Endpoints ---

// Serve the front-end UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to trigger the build
app.post('/build-apk', async (req, res) => {
  const { host, launcherName } = req.body;

  if (!host || !launcherName) {
    return res.status(400).send({ error: 'Host and Launcher Name are required.' });
  }

  // Path to the expected output APK file after a successful bubblewrap build
  // This path is standard for bubblewrap output.
  const outputApkPath = path.join(__dirname, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-signed.apk');

  try {
    // 1. Update the manifest file with user data
    console.log(`Starting build for Host: ${host} and Name: ${launcherName}`);
    await updateManifest(host, launcherName);

    // 2. Run checksum update (this regenerates manifest-checksum.txt)
    console.log('Generating new manifest checksum...');
    await executeCommand('bubblewrap manifest-checksum twa-manifest.json');

    // 3. Run the main build
    console.log('Starting bubblewrap build...');
    // The -p flag (accept privacy policy) is required for unattended builds
    // The build process will take time (Cloud Run instance might stay active for a few minutes)
    await executeCommand('bubblewrap build -p');

    // 4. Check if APK exists and serve it
    await fs.access(outputApkPath); // Check if file exists
    
    console.log(`Build successful. Serving ${outputApkPath}`);

    // Set a dynamic filename for the download
    const safeLauncherName = launcherName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeLauncherName}_${Date.now()}.apk`;

    // Use res.download to handle file streaming and clean headers
    res.download(outputApkPath, filename, (err) => {
        if (err) {
            console.error('Error during APK download/stream:', err);
            // Note: If headers were already sent, this might not work
        }
        // Optional: Clean up the generated APK after successful download
        // In a shared temporary environment like Cloud Run, cleanup is often good practice.
        // fs.unlink(outputApkPath).catch(e => console.error('Failed to clean up APK:', e));
    });

  } catch (error) {
    console.error('Full build process failed:', error);
    // If headers have not been sent (i.e., the error occurred before res.download)
    if (!res.headersSent) {
      res.status(500).send({ 
          error: 'APK Build Failed.',
          message: error.message
      });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Bubblewrap Builder running on port ${port}`);
});
