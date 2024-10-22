import aiohttp
import os

API_KEY = '23rf23rr'
API_URL = "https://lic.proxysmart.org"

async def issue_license(date_expiry, max_modems, machine_data, customer_id, comment):
    url = f"{API_URL}/issue"
    payload = {
        "Date_expiry": date_expiry,
        "max_modems": max_modems,
        "machine_data": machine_data,
        "CustomerID": customer_id,
        "Comment": comment,
        "key": API_KEY
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            data = await response.json()
            if data.get("result") != "success":
                raise Exception(f"Ошибка при создании лицензии: {data.get('error_msg')}")
            return data

async def revoke_license(license_hash):
    url = f"{API_URL}/revoke"
    payload = {
        "license_hash": license_hash,
        "key": API_KEY
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            data = await response.json()
            if data.get("result") != "success":
                raise Exception(f"Ошибка при отзыве лицензии: {data.get('error_msg')}")
            return data
