# EcoVoice Web

React + TypeScript + Vite ile Firebase Authentication ve canlı Firestore paneli.

## Çalıştırma

`npm install`, ardından `.env.example` dosyasını `.env.local` olarak kopyalayın ve `npm run dev` çalıştırın. Doğrulama: `npm run build` ve `npm run lint`.

## Firebase ve Android veri sözleşmesi

Firebase projesi: `ecovoice-da355`. Kullanıcı belgesi `users/{uid}` olmalıdır. `rol` değeri `admin` veya `belediye`; belediye hesabında varsayılan ilçe alanı `ilce` zorunludur. `ilce` yoksa `district` okunur. Alan adı `VITE_USER_DISTRICT_FIELD` ile değiştirilebilir. Web panelinde yalnızca mevcut hesaplarla giriş yapılır; kayıt ve demo girişi bulunmaz.

Koleksiyon adı ve aşağıdaki alanlar paylaşılan Android bildirim belgesiyle karşılaştırıldı. Canlı hesapla telefon → web akışı ayrıca doğrulanmalıdır.

Varsayılan şikâyet koleksiyonu `reports`; `VITE_REPORTS_COLLECTION` ile değiştirilebilir. `src/reports.ts` içindeki `reportSchema.fields` ve `reportSchema.statuses` Android'in alan ve durum değerleriyle aynı olmalıdır. Okuma, ilçe sorgusu ve yazma aynı eşlemeyi kullanır.

| Alan | Beklenen değer |
| --- | --- |
| title, description, district, category | Metin |
| status | pending, rejected, new, in_progress, resolved |
| priority | Düşük, Orta, Yüksek |
| lat, lng | Sayısal enlem/boylam; konumsuz bildirim listede görünür |
| photo, solutionPhoto | HTTPS fotoğraf URL'si |

Onay `new`, ret `rejected`, müdahale `in_progress`, çözüm `resolved` yazar. Durum değişiminde `updatedAt` ve ilgili `approvedAt`, `rejectedAt`, `startedAt`, `resolvedAt` sunucu zamanları kaydedilir. Çözüm fotoğrafı olmadan çözüm işlemi açılmaz.

Admin tüm koleksiyonu, belediye kendi ilçesini `onSnapshot` ile dinler. İlk sunucu yüklemesi yeni şikâyet uyarısı üretmez; sonraki yeni bekleyen bildirimler panelde uyarı oluşturur. Dinleyiciler oturum değişince kapatılır. Yazma başarısız olursa başarı mesajı gösterilmez. Harita Leaflet/OpenStreetMap kullanır.

## Fotoğraf

`VITE_IMGBB_API_KEY` tanımlayın ve geliştirme sunucusunu yeniden başlatın. En fazla 1 MB JPG/PNG/WebP ImgBB'ye gönderilir, Firestore'a yalnızca HTTPS URL'si yazılır. VITE anahtarları istemcide görünür; gizli sunucu anahtarı olarak değerlendirilmemelidir. Firestore yazması yüklemeden sonra başarısız olursa ImgBB'de kullanılmayan bir fotoğraf kalabilir.

## Erişim ve canlı doğrulama

Firestore kuralları bu depoda bulunmuyor ve değiştirilmedi. Mevcut kurallar admin okuma/güncellemelerine, belediyenin kendi ilçesine ait sorgu ve izin verilen güncellemelerine izin vermeli; kullanıcıların kendi rollerini değiştirmesini engellemelidir. Arayüzdeki rol kontrolü veritabanı yetkilendirmesinin yerini tutmaz.

Gerçek hesaplarla kontrol: Android'den bekleyen bildirim gönderin → admin ekranında ve yeni bildirim uyarısında görünmesini doğrulayın → onaylayın → ilgili ilçe belediyesinde görünmesini doğrulayın → müdahale, ImgBB fotoğraf ve çözüm adımlarını uygulayın → telefonda aynı belgenin güncellendiğini doğrulayın. Başka ilçe hesabının belgeye erişemediğini de kontrol edin.

## Harita ve admin durum düzeltmeleri

Admin ve belediye panellerinde onaylanan bildirimler haritada görünür: kırmızı `new` (çözülmemiş), sarı `in_progress`, yeşil `resolved`. Bekleyen/reddedilen kayıtlar haritada gösterilmez. Liste filtreleri haritadaki genel durum görünümünü değiştirmez; harita tüm onaylanan kayıtları gösterir. Konumsuz kayıtlar listelenir ve haritanın altında sayıları belirtilir.

Harita İzmir–Manisa merkezli açılır. “İzmir–Manisa’ya dön” bölge görünümünü, “Tüm noktaları göster” konumu bulunan tüm onaylı bildirimleri kadraja alır. Canlı veriler güncellendiğinde kullanıcının yakınlaştırması ve harita konumu korunur. İl sınırları geoBoundaries/OpenStreetMap kaynaklıdır; veri sürümü ve lisans `src/data/BOUNDARIES.md` dosyasındadır.

Durum kartları ve liste filtresi aynı seçimi kullanır. “Onaylanan” yeni, müdahalede ve çözülmüş kayıtları kapsar. Admin, her kayıtta “Durumu / önceliği düzenle” bölümünden durumu tekrar incelemeye alabilir, reddedebilir veya düzeltebilir. Kaydet düğmesi Firestore'a yazar; eski aşamalara dönüşte geçersiz kalan aşama tarihleri silinir. Özgün oluşturulma tarihi ve çözüm fotoğrafı korunur. Çözüldü durumuna geçiş için çözüm fotoğrafı gerekir. Bu güncellemelerin mevcut Firestore kurallarınca da izinli olması gerekir.

Çözüm fotoğrafı tek bir URL alanında saklanır; dosya seçici yalnızca tek fotoğraf kabul eder. “Fotoğrafı değiştir” mevcut URL'yi yeni yükleme başarılı olduktan sonra değiştirir. Yükleme veya Firestore yazması başarısız olursa mevcut fotoğraf korunur. “Fotoğrafı kaldır” Firestore'daki çözüm fotoğrafı alanını siler; çözülmüş kayıtta bu işlem aynı yazmada durumu `in_progress` yapıp `resolvedAt` alanını temizler. Kaldırılan URL'nin ImgBB üzerindeki dosyası silinmez. Aynı dosya tekrar seçilebilir.
