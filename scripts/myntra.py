import argparse
import random
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Set up argument parsing
parser = argparse.ArgumentParser(description='Scrape Myntra for products.')
parser.add_argument('color', type=str, help='Color of the apparel')
parser.add_argument('gender', type=str, help='Gender for the apparel')
parser.add_argument('product', type=str, help='Type of product to search for')
parser.add_argument('--sort', type=str, choices=['price', 'popularity'], help='Sort results by price or popularity')
args = parser.parse_args()

color = args.color
gender = args.gender
product = args.product
sort_option = args.sort

# Randomize user agent
user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
]

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument(f'user-agent={random.choice(user_agents)}')
options.binary_location = r'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'  # Path to Brave browser

driver = webdriver.Chrome(options=options)

try:
    print("Opening Myntra website...")
    driver.get("https://www.myntra.com/")
    time.sleep(random.uniform(3, 5))  # Random sleep to mimic human behavior

    # Wait for the search input to be present
    wait = WebDriverWait(driver, 20)
    print("Waiting for the search bar...")
    input_search = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'desktop-searchBar')))
    print("Search bar located.")
    input_search.send_keys(f"{color} {product} for {gender}")
    time.sleep(random.uniform(1, 3))  # Random sleep to mimic human behavior

    print("Clicking search button...")
    search_button_xpath = '//*[@class="desktop-submit"]'
    search_button = wait.until(EC.element_to_be_clickable((By.XPATH, search_button_xpath)))
    search_button.click()
    print("Search button clicked.")
    time.sleep(random.uniform(5, 7))  # Wait for the search results to load

    # Scroll down to load more products if necessary
    print("Scrolling to load more products...")
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(random.uniform(2, 4))

    # Wait for the results to load
    print("Locating product elements...")
    product_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, '//li[@class="product-base"]')))

    data = []
    for element in product_elements:
        try:
            brand = element.find_element(By.XPATH, './/h3[@class="product-brand"]').text
        except:
            brand = "N/A"
        
        try:
            name = element.find_element(By.XPATH, './/h4[@class="product-product"]').text
        except:
            name = "N/A"

        try:
            price = element.find_element(By.XPATH, './/span[contains(@class, "product-discountedPrice")]').text
        except:
            try:
                price = element.find_element(By.XPATH, './/span[@class="product-strike"]').text
            except:
                price = element.find_element(By.XPATH, './/span[not(@class)]').text

        try:
            image_src = element.find_element(By.XPATH, './/img[@class="img-responsive"]').get_attribute('src')
        except:
            image_src = "N/A"
            break
        
        try:
            product_link = element.find_element(By.XPATH, './/a').get_attribute('href')
        except:
            product_link = "N/A"

        print(f'Brand: {brand}, Product: {name}, Price: {price}, Image: {image_src}, Link: {product_link}')
        data.append({
            'Brand': brand,
            'Product': name,
            'Price': price,
            'Image': image_src,
            'Link': product_link
        })

    # Optional sorting
    if sort_option == 'price':
        data.sort(key=lambda x: float(x['Price'].replace('₹', '').replace(',', '')))
    elif sort_option == 'popularity':
        pass  # Placeholder for future logic

    # Save data to JSON file in public directory
    with open(f'../public/products.json', 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
    print(f"Data saved to products.json")

#error also saved 

except Exception as e:
    print(f"Error: {e}")
    with open('error_page_source.html', 'w', encoding='utf-8') as f:
        f.write(driver.page_source)
    driver.save_screenshot('error_screenshot.png')
finally:
    driver.quit()
    print("Browser closed.")
