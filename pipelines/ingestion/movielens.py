import os
import requests
import zipfile
import pandas as pd

def download_movielens():
    url = "http://files.grouplens.org/datasets/movielens/ml-100k.zip"
    os.makedirs("data/raw", exist_ok=True)
    zip_path = "data/raw/ml-100k.zip"
    
    if not os.path.exists(zip_path):
        print("Downloading MovieLens 100k dataset...")
        response = requests.get(url, stream=True)
        with open(zip_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Download complete.")
        
    extracted_dir = "data/raw/ml-100k"
    if not os.path.exists(extracted_dir):
        print("Extracting...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall("data/raw")
        print("Extraction complete.")

def parse_and_save():
    # 1. Ratings
    print("Parsing ratings...")
    ratings_cols = ['user_id', 'item_id', 'rating', 'timestamp']
    ratings = pd.read_csv('data/raw/ml-100k/u.data', sep='\t', names=ratings_cols, encoding='latin-1')
    ratings.to_csv('data/raw/ratings.csv', index=False)
    
    # 2. Movies
    print("Parsing movies...")
    # u.item format: movie id | movie title | release date | video release date | IMDb URL | unknown | Action | Adventure | Animation | Children's | Comedy | Crime | Documentary | Drama | Fantasy | Film-Noir | Horror | Musical | Mystery | Romance | Sci-Fi | Thriller | War | Western |
    movie_cols = ['item_id', 'title', 'release_date', 'video_release_date', 'imdb_url', 'unknown', 'Action', 'Adventure', 'Animation', 'Childrens', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western']
    movies = pd.read_csv('data/raw/ml-100k/u.item', sep='|', names=movie_cols, encoding='latin-1')
    movies = movies[['item_id', 'title']]  # Keep it simple for now, we can join genres later
    movies.to_csv('data/raw/movies.csv', index=False)
    
    # 3. Users
    print("Parsing users...")
    user_cols = ['user_id', 'age', 'gender', 'occupation', 'zip_code']
    users = pd.read_csv('data/raw/ml-100k/u.user', sep='|', names=user_cols, encoding='latin-1')
    users.to_csv('data/raw/users.csv', index=False)
    
    print("Data processing complete! Saved to data/raw/")

if __name__ == "__main__":
    download_movielens()
    parse_and_save()
