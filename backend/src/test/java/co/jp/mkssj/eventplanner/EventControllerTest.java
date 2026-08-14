package co.jp.mkssj.eventplanner;

import co.jp.mkssj.eventplanner.dto.AuthResponseDto;
import co.jp.mkssj.eventplanner.dto.CheckpointItem;
import co.jp.mkssj.eventplanner.dto.EventDto;
import co.jp.mkssj.eventplanner.dto.EventUpsertRequest;
import co.jp.mkssj.eventplanner.dto.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * イベントCRUD APIのスモークテスト。H2(インメモリ)を使い、
 * ユーザー登録→ログイン→作成→年で一覧取得→更新→削除まで一通りの動作を確認する。
 * あわせて未認証アクセスの拒否と、他ユーザーのイベントが見えないことも検証する。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EventControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private String token;

    @BeforeEach
    void registerAndLogin() {
        String username = "test-" + UUID.randomUUID();
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername(username);
        registerRequest.setPassword("password123");

        ResponseEntity<AuthResponseDto> response =
                restTemplate.postForEntity("/api/auth/register", registerRequest, AuthResponseDto.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        this.token = response.getBody().getToken();
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void createListUpdateAndDeleteEvent() {
        EventUpsertRequest createRequest = EventUpsertRequest.builder()
                .year(2026)
                .name("新商品プロジェクト")
                .owner("開発")
                .color("#9c2d96")
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 9, 30))
                .goalDate(LocalDate.of(2026, 9, 30))
                .goalColor("#1565c0")
                .checkpoints(List.of(
                        CheckpointItem.builder().date(LocalDate.of(2026, 5, 15)).label("50%の問題集完了").color("#2e7d32").build(),
                        CheckpointItem.builder().date(LocalDate.of(2026, 7, 1)).build()))
                .build();

        ResponseEntity<EventDto> createResponse = restTemplate.exchange(
                "/api/events", HttpMethod.POST, new HttpEntity<>(createRequest, authHeaders()), EventDto.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        EventDto created = createResponse.getBody();
        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        assertThat(created.getOwner()).isEqualTo("開発");
        assertThat(created.getCheckpoints()).extracting(CheckpointItem::getDate).containsExactly(
                LocalDate.of(2026, 5, 15), LocalDate.of(2026, 7, 1));
        assertThat(created.getCheckpoints()).extracting(CheckpointItem::getLabel).containsExactly(
                "50%の問題集完了", "");
        // 1件目は色を指定、2件目は未指定(デフォルト色にフォールバックする)ことを確認
        assertThat(created.getCheckpoints()).extracting(CheckpointItem::getColor).containsExactly(
                "#2e7d32", "#1c1a17");
        assertThat(created.getGoalColor()).isEqualTo("#1565c0");

        ResponseEntity<EventDto[]> listResponse = restTemplate.exchange(
                "/api/events?year=2026", HttpMethod.GET, new HttpEntity<>(authHeaders()), EventDto[].class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody()).hasSize(1);

        // 別の年で取得すると0件(年ごとに独立して管理されていることの確認)
        ResponseEntity<EventDto[]> otherYearResponse = restTemplate.exchange(
                "/api/events?year=2027", HttpMethod.GET, new HttpEntity<>(authHeaders()), EventDto[].class);
        assertThat(otherYearResponse.getBody()).isEmpty();

        // 更新: 期間をずらし、チェックポイントを1件に減らす
        EventUpsertRequest updateRequest = EventUpsertRequest.builder()
                .year(2026)
                .name("新商品プロジェクト")
                .color("#9c2d96")
                .startDate(LocalDate.of(2026, 4, 25))
                .endDate(LocalDate.of(2026, 10, 24))
                .goalDate(LocalDate.of(2026, 10, 24))
                .checkpoints(List.of(CheckpointItem.builder().date(LocalDate.of(2026, 7, 1)).label("最終レビュー").build()))
                .build();
        restTemplate.exchange("/api/events/" + created.getId(), HttpMethod.PUT,
                new HttpEntity<>(updateRequest, authHeaders()), Void.class);

        ResponseEntity<EventDto[]> afterUpdate = restTemplate.exchange(
                "/api/events?year=2026", HttpMethod.GET, new HttpEntity<>(authHeaders()), EventDto[].class);
        assertThat(afterUpdate.getBody()).hasSize(1);
        EventDto updated = afterUpdate.getBody()[0];
        assertThat(updated.getStartDate()).isEqualTo(LocalDate.of(2026, 4, 25));
        assertThat(updated.getCheckpoints()).extracting(CheckpointItem::getDate).containsExactly(LocalDate.of(2026, 7, 1));
        // 更新リクエストでgoalColorを指定しなかった場合はデフォルト色にフォールバックすることを確認
        assertThat(updated.getGoalColor()).isEqualTo("#b3241c");
        assertThat(updated.getCheckpoints()).extracting(CheckpointItem::getLabel).containsExactly("最終レビュー");

        // 開始日が終了日より後だと400
        EventUpsertRequest invalidRequest = EventUpsertRequest.builder()
                .year(2026)
                .name("不正な期間")
                .color("#9c2d96")
                .startDate(LocalDate.of(2026, 12, 1))
                .endDate(LocalDate.of(2026, 1, 1))
                .checkpoints(List.of())
                .build();
        ResponseEntity<String> invalidResponse = restTemplate.exchange("/api/events", HttpMethod.POST,
                new HttpEntity<>(invalidRequest, authHeaders()), String.class);
        assertThat(invalidResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // 削除
        restTemplate.exchange("/api/events/" + created.getId(), HttpMethod.DELETE,
                new HttpEntity<>(authHeaders()), Void.class);
        ResponseEntity<EventDto[]> afterDelete = restTemplate.exchange(
                "/api/events?year=2026", HttpMethod.GET, new HttpEntity<>(authHeaders()), EventDto[].class);
        assertThat(afterDelete.getBody()).isEmpty();
    }

    @Test
    void rejectsRequestsWithoutToken() {
        ResponseEntity<String> response =
                restTemplate.getForEntity("/api/events?year=2026", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void usersCannotSeeEachOthersEvents() {
        // このユーザー(setUpのtoken)で1件作成
        EventUpsertRequest createRequest = EventUpsertRequest.builder()
                .year(2026)
                .name("自分のイベント")
                .color("#9c2d96")
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 1, 31))
                .checkpoints(List.of())
                .build();
        ResponseEntity<EventDto> createResponse = restTemplate.exchange(
                "/api/events", HttpMethod.POST, new HttpEntity<>(createRequest, authHeaders()), EventDto.class);
        Long ownEventId = createResponse.getBody().getId();

        // 別ユーザーを登録してログイン
        String otherUsername = "test-" + UUID.randomUUID();
        RegisterRequest otherRegister = new RegisterRequest();
        otherRegister.setUsername(otherUsername);
        otherRegister.setPassword("password123");
        ResponseEntity<AuthResponseDto> otherAuth =
                restTemplate.postForEntity("/api/auth/register", otherRegister, AuthResponseDto.class);
        HttpHeaders otherHeaders = new HttpHeaders();
        otherHeaders.setBearerAuth(otherAuth.getBody().getToken());

        // 別ユーザーの一覧には出てこない
        ResponseEntity<EventDto[]> otherList = restTemplate.exchange(
                "/api/events?year=2026", HttpMethod.GET, new HttpEntity<>(otherHeaders), EventDto[].class);
        assertThat(otherList.getBody()).isEmpty();

        // 別ユーザーがid指定で更新しようとすると404
        ResponseEntity<String> otherUpdate = restTemplate.exchange(
                "/api/events/" + ownEventId, HttpMethod.PUT,
                new HttpEntity<>(createRequest, otherHeaders), String.class);
        assertThat(otherUpdate.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 別ユーザーがid指定で削除しようとすると404
        ResponseEntity<String> otherDelete = restTemplate.exchange(
                "/api/events/" + ownEventId, HttpMethod.DELETE,
                new HttpEntity<>(otherHeaders), String.class);
        assertThat(otherDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
