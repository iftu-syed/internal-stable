from textblob import TextBlob

text = "I am happy with my hardwork."
blob = TextBlob(text)
print(blob.sentiment)
