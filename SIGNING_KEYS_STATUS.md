# Android Signing Keys - Status Local

## Elite 2050

Package:

```text
com.becoslab.elite2050
```

Arquivos locais gerados para assinatura release:

```text
C:\Users\Afonso\Downloads\elite-2050\android\elite2050-release.jks
C:\Users\Afonso\Downloads\elite-2050\android\key.properties
```

Alias:

```text
elite2050_release
```

Certificado/fingerprint publico:

```text
SHA1   = F2:C5:4F:90:1D:BA:B2:71:42:1F:CA:23:72:43:2D:F7:8F:E4:FE:AA
SHA256 = 3C:21:66:46:BB:45:FB:FC:54:19:E6:D8:87:E0:F4:43:9B:F1:7C:66:91:D0:35:1B:5F:59:56:72:55:9D:44:29
```

Senha definida manualmente antes do primeiro upload na Play:

```text
Elite1010!
```

Observacao: a primeira chave com senha automatica foi arquivada antes do reset em:

```text
C:\Users\Afonso\Documents\BecosLab-Key-Backups\20260530-181233\elite2050-old-auto-password-before-reset
```

Backup obrigatorio:

- guardar `elite2050-release.jks`
- guardar `key.properties`
- nao mandar esses arquivos para GitHub

## Glyph / GOL1.006

Package:

```text
life.glyph.app
```

Arquivo de upload key encontrado:

```text
C:\Users\Afonso\Downloads\GOL1.006\android\app\glyph-upload-key.jks
```

O Gradle do Glyph procura este arquivo de configuracao:

```text
C:\Users\Afonso\Downloads\GOL1.006\android\keystore.properties
```

Estado local encontrado:

- `glyph-upload-key.jks` existe.
- `android\keystore.properties` foi recuperado/criado em 2026-05-30.
- alias confirmado: `glyphupload`.
- fingerprint publico confirmado:

```text
SHA1   = 88:BA:D2:56:1B:F5:5A:2A:52:B8:22:44:AF:27:C2:C1:45:E8:BE:7E
SHA256 = CC:B2:50:2A:1B:94:79:0A:6A:8A:A0:5F:B8:46:91:29:E3:43:37:BE:D4:FD:94:C9:18:31:6E:92:47:AA:09:F3
```

- o AAB release antigo encontrado em `GOL1.006\android\app\build\outputs\bundle\release\app-release.aab` apareceu como unsigned pela verificacao local antes da recuperacao do `keystore.properties`; gerar um bundle novo deve usar a chave recuperada.
- para confirmar a assinatura de upload usada no Play, abrir no Play Console: **Setup > App integrity** / **Integridade do app** e conferir o certificado de upload.

Nao substituir a chave do Glyph pela chave do Elite 2050.

## Backup feito em 2026-05-30

Pasta local de backup criada:

```text
C:\Users\Afonso\Documents\BecosLab-Key-Backups\20260530-181233
```

Conteudo copiado:

```text
glyph-upload-key.jks
elite2050-release.jks
key.properties
c.kdbx
other.xml
README_SIGNING_BACKUP.txt
```

O arquivo `c.kdbx` e o cofre local do Android Studio neste Windows:

```text
C:\Users\Afonso\AppData\Roaming\Google\AndroidStudio2025.3.3\c.kdbx
```

Observacao importante:

- O Android Studio lembra a senha do Glyph na tela de gerar bundle.
- A senha foi confirmada localmente pelo `keytool` e salva no `android\keystore.properties` do Glyph.
- O backup do `c.kdbx` pode ajudar a preservar a senha neste perfil Windows, mas nao substitui anotar a senha real.

## Como ficar 100% safe com o Glyph

1. Abrir Android Studio no projeto:

```text
C:\Users\Afonso\Downloads\GOL1.006\android
```

2. Ir em `Build > Generate Signed Bundle / APK`.
3. Confirmar que esta selecionado:

```text
C:\Users\Afonso\Downloads\GOL1.006\android\app\glyph-upload-key.jks
alias: glyphupload
```

4. Como o Android Studio ja lembra as senhas, gerar um AAB.
5. Guardar o `glyph-upload-key.jks` em pelo menos dois lugares fora do repo.
6. O arquivo foi criado no Glyph:

```text
C:\Users\Afonso\Downloads\GOL1.006\android\keystore.properties
```

Formato:

```text
storeFile=app/glyph-upload-key.jks
storePassword=SENHA_REAL
keyAlias=glyphupload
keyPassword=SENHA_REAL
```

Depois disso o Glyph volta a ser assinavel tambem via terminal/Gradle.
