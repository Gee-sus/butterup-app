from unittest import mock

from rest_framework import status
from rest_framework.test import APITestCase

from api.views import off_client


class MockResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class OFFEndpointsTests(APITestCase):
    def setUp(self):
        super().setUp()
        off_client.cache.clear()

    def tearDown(self):
        off_client.cache.clear()
        super().tearDown()

    def _product_payload(self, code="1234567890123"):
        return {
            "status": 1,
            "product": {
                "code": code,
                "product_name": "Salted Butter",
                "brands": "Acme Butter Co",
                "quantity": "500 g",
                "nutriscore_grade": "c",
                "nutriments": {
                    "energy-kcal_100g": "720",
                    "fat_100g": "80",
                },
                "image_front_url": "https://images.example/off/butter.jpg",
            },
        }

    def test_health_check_returns_ok(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"status": "ok"})

    @mock.patch("api.services.off_client.requests.get")
    def test_product_detail_success(self, mock_get):
        mock_get.return_value = MockResponse(payload=self._product_payload())

        response = self.client.get("/api/off/product/1234567890123/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["code"], "1234567890123")
        self.assertEqual(payload["name"], "Salted Butter")
        self.assertEqual(payload["brand"], "Acme Butter Co")
        self.assertEqual(payload["nutriScore"], "C")
        self.assertIn("nutriments", payload)
        self.assertIn("energy_kcal_100g", payload["nutriments"])

    @mock.patch("api.services.off_client.requests.get")
    def test_product_detail_not_found(self, mock_get):
        mock_get.return_value = MockResponse(payload={"status": 0})

        response = self.client.get("/api/off/product/0000000000000/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {"error": "NOT_FOUND"})

    @mock.patch("api.services.off_client.requests.get")
    def test_product_detail_field_filtering(self, mock_get):
        mock_get.return_value = MockResponse(payload=self._product_payload())

        response = self.client.get("/api/off/product/1234567890123/?fields=name,image")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(set(payload.keys()), {"code", "name", "image"})

    @mock.patch("api.services.off_client.requests.get")
    def test_search_returns_minimal_hits(self, mock_get):
        mock_get.return_value = MockResponse(
            payload={
                "count": 1,
                "page": 1,
                "page_size": 20,
                "products": [
                    {
                        "code": "1234567890123",
                        "product_name": "Salted Butter",
                        "brands": "Acme Butter Co",
                        "image_front_url": "https://images.example/off/butter.jpg",
                    }
                ],
            }
        )

        response = self.client.get("/api/off/search/?q=butter")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["code"], "1234567890123")
        self.assertEqual(
            set(payload["items"][0].keys()),
            {"code", "name", "brand", "image"},
        )

    @mock.patch("api.services.off_client.requests.get")
    def test_batch_returns_found_and_missing_items(self, mock_get):
        def side_effect(url, params=None, headers=None, timeout=None):
            if "1234567890123" in url:
                return MockResponse(payload=self._product_payload())
            if "0000000000000" in url:
                return MockResponse(payload={"status": 0})
            return MockResponse(status_code=404, payload={})

        mock_get.side_effect = side_effect

        response = self.client.post(
            "/api/off/batch/",
            {
                "codes": ["1234567890123", "not-a-code", "0000000000000"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["code"], "1234567890123")
        self.assertEqual(payload["not_found"], ["0000000000000"])
        self.assertEqual(payload.get("invalid"), ["not-a-code"])
