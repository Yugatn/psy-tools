import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:cryptography_flutter/cryptography_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class EncryptionService {
  static const _keyName = 'psy_tools_data_key_v1';
  static const _storage = FlutterSecureStorage();
  static final _cipher = AesGcm.with256bits();

  Future<void> _ensureNativeCrypto() async {
    Cryptography.instance = FlutterCryptography();
  }

  Future<SecretKey> _key() async {
    await _ensureNativeCrypto();
    var encoded = await _storage.read(key: _keyName);
    if (encoded == null) {
      final key = await _cipher.newSecretKey();
      encoded = base64UrlEncode(await key.extractBytes());
      await _storage.write(key: _keyName, value: encoded);
      return key;
    }
    return SecretKey(base64Url.decode(encoded));
  }

  Future<String> encrypt(Map<String,dynamic> data) async {
    final key = await _key();
    final plaintext = utf8.encode(jsonEncode(data));
    final box = await _cipher.encrypt(plaintext, secretKey:key);
    return jsonEncode({
      'format':'psytools-encrypted-v1',
      'algorithm':'AES-256-GCM',
      'nonce':base64UrlEncode(box.nonce),
      'cipherText':base64UrlEncode(box.cipherText),
      'mac':base64UrlEncode(box.mac.bytes),
    });
  }

  Future<Map<String,dynamic>> decrypt(String payload) async {
    final envelope = Map<String,dynamic>.from(jsonDecode(payload) as Map);
    if (envelope['format'] != 'psytools-encrypted-v1') {
      throw const FormatException('Unsupported encrypted data format');
    }
    final box = SecretBox(
      base64Url.decode(envelope['cipherText'] as String),
      nonce:base64Url.decode(envelope['nonce'] as String),
      mac:Mac(base64Url.decode(envelope['mac'] as String)),
    );
    final key = await _key();
    final plaintext = await _cipher.decrypt(box,secretKey:key);
    final decoded=jsonDecode(utf8.decode(plaintext));
    if(decoded is! Map) throw const FormatException('Encrypted data root must be an object');
    return Map<String,dynamic>.from(decoded as Map);
  }
}
