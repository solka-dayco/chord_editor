package com.chorditor.app;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "SaveImage")
public class SaveImagePlugin extends Plugin {

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String base64Data = call.getString("base64");
        String fileName   = call.getString("fileName", "chord.png");

        if (base64Data == null) {
            call.reject("base64 데이터가 필요합니다.");
            return;
        }

        try {
            byte[] bytes  = Base64.decode(base64Data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) { call.reject("이미지 디코딩 실패"); return; }

            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ : 권한 없이 Pictures/Chorditor 폴더에 저장
                values.put(MediaStore.Images.Media.RELATIVE_PATH,
                        Environment.DIRECTORY_PICTURES + "/Chorditor");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            }

            Uri uri = getContext().getContentResolver()
                    .insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) { call.reject("MediaStore 항목 생성 실패"); return; }

            try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
            }

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);

        } catch (Exception e) {
            call.reject("저장 실패: " + e.getMessage());
        }
    }
}
