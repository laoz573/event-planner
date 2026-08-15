package co.jp.mkssj.eventplanner;

import co.jp.mkssj.eventplanner.dto.AuthResponseDto;
import co.jp.mkssj.eventplanner.dto.CheckpointItem;
import co.jp.mkssj.eventplanner.dto.EventDto;
import co.jp.mkssj.eventplanner.dto.EventUpsertRequest;
import co.jp.mkssj.eventplanner.dto.LoginRequest;
import co.jp.mkssj.eventplanner.dto.ShareSettingDto;
import co.jp.mkssj.eventplanner.dto.ShareUpsertRequest;
import co.jp.mkssj.eventplanner.dto.UserSummaryDto;
import co.jp.mkssj.eventplanner.entity.AppUser;
import co.jp.mkssj.eventplanner.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * イベント共有機能(/api/shares, /api/events/shared, /api/users)のテスト。
 *
 * - shareAll=trueで共有すると、共有した後に追加したイベントも自動的に相手から見えること
 * - shareAll=falseでは、個別に選んだイベントだけが相手から見えること
 * - 共有された側はイベントを編集・削除できない(閲覧専用)こと
 * - 共有解除(DELETE /api/shares/{id})で見えなくなること
 * - 自分自身との共有・存在しないユーザーとの共有が拒否されること
 * を確認する。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ShareControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private AppUserRepository appUserRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private record TestUser(Long id, String username, HttpHeaders headers) {
    }

    private TestUser createUser() {
        String username = "test-" + UUID.randomUUID();
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode("password123"));
        AppUser saved = appUserRepository.save(user);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername(username);
        loginRequest.setPassword("password123");
        ResponseEntity<AuthResponseDto> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, AuthResponseDto.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginResponse.getBody().getToken());
        return new TestUser(saved.getId(), username, headers);
    }

    private EventDto createEvent(TestUser owner, String name, LocalDate start, LocalDate end) {
        EventUpsertRequest request = EventUpsertRequest.builder()
                .year(2026)
                .name(name)
                .color("#9c2d96")
                .startDate(start)
                .endDate(end)
                .checkpoints(List.of(CheckpointItem.builder().date(start).label("").color("#1c1a17").build()))
                .build();
        ResponseEntity<EventDto> response = restTemplate.exchange(
                "/api/events", HttpMethod.POST, new HttpEntity<>(request, owner.headers()), EventDto.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody();
    }

    private ResponseEntity<ShareSettingDto> putShare(TestUser owner, Long sharedWithUserId, boolean shareAll, List<Long> eventIds) {
        ShareUpsertRequest request = ShareUpsertRequest.builder().shareAll(shareAll).eventIds(eventIds).build();
        return restTemplate.exchange("/api/shares/" + sharedWithUserId, HttpMethod.PUT,
                new HttpEntity<>(request, owner.headers()), ShareSettingDto.class);
    }

    private List<EventDto> fetchShared(TestUser user, int year) {
        ResponseEntity<EventDto[]> response = restTemplate.exchange(
                "/api/events/shared?year=" + year, HttpMethod.GET, new HttpEntity<>(user.headers()), EventDto[].class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return List.of(response.getBody());
    }

    @Test
    void shareAllExposesExistingAndFutureEventsToRecipient() {
        TestUser owner = createUser();
        TestUser recipient = createUser();

        EventDto existing = createEvent(owner, "既存イベント", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10));

        ResponseEntity<ShareSettingDto> shareResponse = putShare(owner, recipient.id(), true, List.of());
        assertThat(shareResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(shareResponse.getBody().isShareAll()).isTrue();

        List<EventDto> sharedBeforeNewEvent = fetchShared(recipient, 2026);
        assertThat(sharedBeforeNewEvent).extracting(EventDto::getName).containsExactly("既存イベント");
        assertThat(sharedBeforeNewEvent.get(0).getOwnerUsername()).isEqualTo(owner.username());

        // shareAll=true の後で追加したイベントも自動的に共有対象になること
        createEvent(owner, "後から追加したイベント", LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 10));
        List<EventDto> sharedAfterNewEvent = fetchShared(recipient, 2026);
        assertThat(sharedAfterNewEvent).extracting(EventDto::getName)
                .containsExactlyInAnyOrder("既存イベント", "後から追加したイベント");
    }

    @Test
    void individualShareOnlyExposesSelectedEvents() {
        TestUser owner = createUser();
        TestUser recipient = createUser();

        EventDto shared = createEvent(owner, "共有するイベント", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10));
        createEvent(owner, "共有しないイベント", LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 10));

        ResponseEntity<ShareSettingDto> shareResponse = putShare(owner, recipient.id(), false, List.of(shared.getId()));
        assertThat(shareResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(shareResponse.getBody().getEventIds()).containsExactly(shared.getId());

        List<EventDto> sharedEvents = fetchShared(recipient, 2026);
        assertThat(sharedEvents).extracting(EventDto::getName).containsExactly("共有するイベント");
    }

    @Test
    void recipientCannotEditOrDeleteSharedEvent() {
        TestUser owner = createUser();
        TestUser recipient = createUser();
        EventDto event = createEvent(owner, "編集不可のはず", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10));
        putShare(owner, recipient.id(), true, List.of());

        EventUpsertRequest updateRequest = EventUpsertRequest.builder()
                .year(2026)
                .name("勝手に変更")
                .color("#000000")
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 1, 10))
                .checkpoints(List.of())
                .build();
        ResponseEntity<String> updateResponse = restTemplate.exchange(
                "/api/events/" + event.getId(), HttpMethod.PUT,
                new HttpEntity<>(updateRequest, recipient.headers()), String.class);
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> deleteResponse = restTemplate.exchange(
                "/api/events/" + event.getId(), HttpMethod.DELETE,
                new HttpEntity<>(recipient.headers()), String.class);
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deletingShareRemovesVisibility() {
        TestUser owner = createUser();
        TestUser recipient = createUser();
        createEvent(owner, "一時的に共有", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10));
        putShare(owner, recipient.id(), true, List.of());
        assertThat(fetchShared(recipient, 2026)).hasSize(1);

        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                "/api/shares/" + recipient.id(), HttpMethod.DELETE, new HttpEntity<>(owner.headers()), Void.class);
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(fetchShared(recipient, 2026)).isEmpty();
    }

    @Test
    void cannotShareWithSelfOrNonexistentUser() {
        TestUser owner = createUser();

        ResponseEntity<String> selfShare = restTemplate.exchange(
                "/api/shares/" + owner.id(), HttpMethod.PUT,
                new HttpEntity<>(ShareUpsertRequest.builder().shareAll(true).build(), owner.headers()), String.class);
        assertThat(selfShare.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> missingUserShare = restTemplate.exchange(
                "/api/shares/999999999", HttpMethod.PUT,
                new HttpEntity<>(ShareUpsertRequest.builder().shareAll(true).build(), owner.headers()), String.class);
        assertThat(missingUserShare.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void userListExcludesSelfAndIncludesOthers() {
        TestUser me = createUser();
        TestUser other = createUser();

        ResponseEntity<UserSummaryDto[]> response = restTemplate.exchange(
                "/api/users", HttpMethod.GET, new HttpEntity<>(me.headers()), UserSummaryDto[].class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).extracting(UserSummaryDto::getId).contains(other.id());
        assertThat(response.getBody()).extracting(UserSummaryDto::getId).doesNotContain(me.id());
    }
}
