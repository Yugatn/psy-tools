class UpdateInfo { final String version; final String notes; final String? url; const UpdateInfo({required this.version,required this.notes,this.url}); }
class UpdateService { Future<UpdateInfo?> check({required String currentVersion}) async { return null; } }
