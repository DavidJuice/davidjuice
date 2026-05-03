// Daily retention sweep:
//   - Move output Sheets in /Runs/ older than retention_days into /Archive/.
//   - Delete files in /Archive/ older than retention_days * 2.
//
// Runs from a daily time-based trigger (installed by ensureRetentionTrigger).

function runRetention() {
  var settings = getSettings();
  var retain = settings.retention_days || 60;
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  if (!parents.hasNext()) return;
  var toolFolder = parents.next();

  var runs    = getOrCreateChildFolder_(toolFolder, settings.output_folder_name  || 'Runs');
  var archive = getOrCreateChildFolder_(toolFolder, settings.archive_folder_name || 'Archive');

  var cutoffMove   = Date.now() - retain * 86400 * 1000;
  var cutoffDelete = Date.now() - retain * 2 * 86400 * 1000;

  var moved = 0;
  var files = runs.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated().getTime() < cutoffMove) {
      archive.addFile(f);
      runs.removeFile(f);
      moved++;
    }
  }

  var deleted = 0;
  var afiles = archive.getFiles();
  while (afiles.hasNext()) {
    var af = afiles.next();
    if (af.getDateCreated().getTime() < cutoffDelete) {
      af.setTrashed(true);
      deleted++;
    }
  }

  audit('retention_sweep', '', {
    detail: 'moved=' + moved + ' deleted=' + deleted + ' retain_days=' + retain
  });
}
